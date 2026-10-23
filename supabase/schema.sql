-- TAIPOC : schéma sécurisé v2. À exécuter dans Supabase > SQL Editor.
-- Principe : le navigateur n'est jamais cru. Prix, totaux et statuts sont décidés côté serveur.
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, position int default 0);
create table public.products (
  id uuid primary key default gen_random_uuid(), category_id uuid references public.categories(id),
  name text not null, description text, price_xof integer not null check (price_xof >= 0),
  old_price_xof integer check (old_price_xof is null or old_price_xof > price_xof),
  shipping_note text default 'Hors frais d''expédition', image_url text, images text[] default '{}', specs jsonb default '[]',
  is_active boolean default true, is_new boolean default false, created_at timestamptz default now());
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, phone text, is_admin boolean not null default false);
create table public.addresses (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, label text check (length(label) <= 300));
create table public.orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','ordered_supplier','shipped','in_transit','arrived_benin','delivered','cancelled')),
  delivery_mode text check (delivery_mode in ('home','pickup')), delivery_address text, delivery_phone text,
  total_xof integer not null default 0, shipping_xof integer, fedapay_transaction_id text unique, created_at timestamptz default now());
create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id), quantity int not null check (quantity between 1 and 100), unit_price_xof integer not null);
create table public.order_events (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, status text not null, note text, created_at timestamptz default now());
create table public.audit_log (id bigserial primary key, actor uuid, action text not null, detail jsonb, created_at timestamptz default now());

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $$;

-- Profil créé automatiquement à l'inscription.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as
$$ begin insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Empêche un client de se donner le rôle admin (seul le SQL Editor / service_role le peut).
create function public.protect_profile() returns trigger language plpgsql security definer set search_path = public as
$$ begin if auth.uid() is not null and new.is_admin is distinct from old.is_admin then raise exception 'is_admin non modifiable'; end if; return new; end $$;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile();

-- Journal des changements de prix.
create function public.log_price() returns trigger language plpgsql security definer set search_path = public as
$$ begin if new.price_xof is distinct from old.price_xof then
  insert into public.audit_log(actor, action, detail) values (auth.uid(), 'price_change', jsonb_build_object('product', new.id, 'old', old.price_xof, 'new', new.price_xof)); end if; return new; end $$;
create trigger log_price after update on public.products for each row execute function public.log_price();

alter table public.categories enable row level security; alter table public.products enable row level security;
alter table public.profiles enable row level security; alter table public.addresses enable row level security;
alter table public.orders enable row level security; alter table public.order_items enable row level security;
alter table public.order_events enable row level security; alter table public.audit_log enable row level security;

create policy "catégories lisibles" on public.categories for select using (true);
create policy "produits actifs lisibles" on public.products for select using (is_active or public.is_admin());
create policy "admin catégories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admin produits" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "mon profil" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "modifier mon profil" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "mes adresses" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mes commandes" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "mes lignes" on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy "mon suivi" on public.order_events for select using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy "audit admin" on public.audit_log for select using (public.is_admin());
-- Aucune politique INSERT/UPDATE sur orders, order_items, order_events : tout passe par les fonctions ci-dessous.

-- Création de commande : les prix sont relus en base, jamais envoyés par le client.
create function public.create_order(p_items jsonb, p_mode text, p_address text, p_phone text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_order uuid; v_total int := 0; r record; v_price int;
begin
  if v_uid is null then raise exception 'connexion requise'; end if;
  if p_mode not in ('home','pickup') then raise exception 'mode de livraison invalide'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'panier invalide'; end if;
  insert into orders(user_id, delivery_mode, delivery_address, delivery_phone) values (v_uid, p_mode, left(p_address, 300), left(p_phone, 20)) returning id into v_order;
  for r in select (e->>'product_id')::uuid as pid, (e->>'qty')::int as qty from jsonb_array_elements(p_items) e loop
    if r.qty is null or r.qty < 1 or r.qty > 100 then raise exception 'quantité invalide'; end if;
    select price_xof into v_price from products where id = r.pid and is_active;
    if v_price is null then raise exception 'produit indisponible'; end if;
    insert into order_items(order_id, product_id, quantity, unit_price_xof) values (v_order, r.pid, r.qty, v_price);
    v_total := v_total + v_price * r.qty;
  end loop;
  update orders set total_xof = v_total where id = v_order;
  insert into order_events(order_id, status, note) values (v_order, 'pending_payment', 'Commande créée');
  return v_order;
end $$;
revoke all on function public.create_order(jsonb, text, text, text) from public, anon;
grant execute on function public.create_order(jsonb, text, text, text) to authenticated;

-- Changement de statut par un admin, avec trace. Le statut « paid » est réservé au webhook FedaPay (service_role).
create function public.admin_set_status(p_order uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'accès refusé'; end if;
  if p_status in ('paid','pending_payment') then raise exception 'statut réservé au paiement'; end if;
  update orders set status = p_status where id = p_order;
  insert into order_events(order_id, status, note) values (p_order, p_status, left(p_note, 300));
  insert into audit_log(actor, action, detail) values (auth.uid(), 'status_change', jsonb_build_object('order', p_order, 'status', p_status));
end $$;
revoke all on function public.admin_set_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_status(uuid, text, text) to authenticated;
