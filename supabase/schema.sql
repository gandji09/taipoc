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

-- ===== Administration : produits détaillés, paiements, témoignages, messages, annonces =====
alter table public.products add column weight_kg numeric, add column lead_time_days int, add column variants text[] default '{}',
  add column stock_status text default 'Disponible' check (stock_status in ('Disponible','Sur commande','Indisponible')), add column is_qualified boolean default false;
-- Infos internes (fournisseur, prix d'achat) : table séparée, jamais lisible par les clients.
create table public.product_private (product_id uuid primary key references public.products(id) on delete cascade, supplier_url text, supplier_cost_xof integer);
alter table public.product_private enable row level security;
create policy "admin seul" on public.product_private for all using (public.is_admin()) with check (public.is_admin());

-- Niveau de paiement écrit par l'admin, visible par le client concerné.
create table public.payment_notes (user_id uuid primary key references auth.users(id) on delete cascade,
  level text not null default 'Aucun paiement' check (level in ('Aucun paiement','Acompte reçu','Soldé','À relancer')), note text check (length(note) <= 300), updated_at timestamptz default now());
alter table public.payment_notes enable row level security;
create policy "mon niveau" on public.payment_notes for select using (user_id = auth.uid() or public.is_admin());
create policy "admin écrit niveau" on public.payment_notes for all using (public.is_admin()) with check (public.is_admin());

-- Témoignages : seulement après un achat payé du produit, publiés après validation.
create table public.testimonials (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id), user_id uuid not null references auth.users(id),
  rating int not null check (rating between 1 and 5), body text not null check (length(body) between 10 and 600), status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(), unique (product_id, user_id));
alter table public.testimonials enable row level security;
create policy "témoignages publiés" on public.testimonials for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "admin modère" on public.testimonials for update using (public.is_admin()) with check (public.is_admin());
create function public.submit_testimonial(p_product uuid, p_rating int, p_body text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  if not exists (select 1 from orders o join order_items i on i.order_id = o.id where o.user_id = auth.uid() and i.product_id = p_product and o.status not in ('pending_payment','cancelled')) then raise exception 'achat payé requis'; end if;
  insert into testimonials(product_id, user_id, rating, body) values (p_product, auth.uid(), p_rating, left(p_body, 600));
end $$;
revoke all on function public.submit_testimonial(uuid, int, text) from public, anon; grant execute on function public.submit_testimonial(uuid, int, text) to authenticated;

-- Messages des clients (préoccupations) : le client voit les siens, l'admin voit tout.
create table public.support_messages (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), order_id uuid references public.orders(id),
  subject text not null check (length(subject) <= 120), body text not null check (length(body) <= 1000), reply text, status text not null default 'Nouveau' check (status in ('Nouveau','En cours','Résolu')), created_at timestamptz default now());
alter table public.support_messages enable row level security;
create policy "mes messages" on public.support_messages for select using (user_id = auth.uid() or public.is_admin());
create policy "écrire un message" on public.support_messages for insert with check (user_id = auth.uid() and status = 'Nouveau' and reply is null);
create policy "admin répond" on public.support_messages for update using (public.is_admin()) with check (public.is_admin());

-- Annonces affichées en haut du site.
create table public.announcements (id uuid primary key default gen_random_uuid(), text text not null check (length(text) <= 140), is_active boolean default false, created_at timestamptz default now());
alter table public.announcements enable row level security;
create policy "annonces actives" on public.announcements for select using (is_active or public.is_admin());
create policy "admin annonces" on public.announcements for all using (public.is_admin()) with check (public.is_admin());

-- Temps réel : nouvelles commandes, messages et annonces sans recharger la page (les règles RLS s'appliquent).
alter publication supabase_realtime add table public.orders, public.support_messages, public.announcements;

-- ===== Photos des produits (Supabase Storage) =====
-- Lecture publique, envoi/modification/suppression réservés aux administrateurs. Taille et formats contrôlés côté serveur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "images produits publiques" on storage.objects for select using (bucket_id = 'product-images');
create policy "admin envoie images" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin modifie images" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin());
create policy "admin supprime images" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());

-- ===== Livreurs : espace réservé aux comptes inscrits ayant le rôle livreur =====
alter table public.profiles add column is_driver boolean not null default false;
create or replace function public.protect_profile() returns trigger language plpgsql security definer set search_path = public as
$$ begin if auth.uid() is not null and (new.is_admin is distinct from old.is_admin or new.is_driver is distinct from old.is_driver) then raise exception 'rôle non modifiable'; end if; return new; end $$;
create function public.is_driver() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select is_driver from public.profiles where id = auth.uid()), false) $$;

create table public.deliveries (id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade,
  driver_id uuid references auth.users(id), status text not null default 'to_assign' check (status in ('to_assign','assigned','out','delivered','failed')),
  note text check (length(note) <= 300), delivered_at timestamptz, updated_at timestamptz default now());
-- Code de remise : visible du client seulement, jamais du livreur. Le serveur le vérifie.
create table public.delivery_codes (delivery_id uuid primary key references public.deliveries(id) on delete cascade, code text not null default lpad((floor(random()*10000))::int::text, 4, '0'));
alter table public.deliveries enable row level security; alter table public.delivery_codes enable row level security;
-- Fonctions d'aide (security definer) : évitent une récursion infinie entre les règles de orders et de deliveries.
create function public.owns_order(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.orders where id = p and user_id = auth.uid()) $$;
create function public.drives_order(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.deliveries where order_id = p and driver_id = auth.uid()) $$;
create policy "admin livraisons" on public.deliveries for all using (public.is_admin()) with check (public.is_admin());
create policy "livreur : mes livraisons" on public.deliveries for select using (driver_id = auth.uid());
create policy "client : ma livraison" on public.deliveries for select using (public.owns_order(order_id));
create policy "client : mon code" on public.delivery_codes for select using (exists (select 1 from public.deliveries d where d.id = delivery_id and public.owns_order(d.order_id)));
-- Le livreur voit la commande (adresse, téléphone, articles) uniquement quand elle lui est confiée.
create policy "livreur : commande confiée" on public.orders for select using (public.drives_order(id));
create policy "livreur : lignes confiées" on public.order_items for select using (public.drives_order(order_id));

create function public.driver_start(p_delivery uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_driver() then raise exception 'accès refusé'; end if;
  update deliveries set status = 'out', updated_at = now() where id = p_delivery and driver_id = auth.uid() and status = 'assigned';
  if not found then raise exception 'livraison introuvable'; end if;
end $$;
create function public.driver_confirm(p_delivery uuid, p_code text) returns void language plpgsql security definer set search_path = public as $$
declare v_order uuid;
begin
  if not public.is_driver() then raise exception 'accès refusé'; end if;
  select d.order_id into v_order from deliveries d join delivery_codes c on c.delivery_id = d.id
    where d.id = p_delivery and d.driver_id = auth.uid() and d.status = 'out' and c.code = p_code;
  if v_order is null then raise exception 'code incorrect'; end if;
  update deliveries set status = 'delivered', delivered_at = now(), updated_at = now() where id = p_delivery;
  update orders set status = 'delivered' where id = v_order;
  insert into order_events(order_id, status, note) values (v_order, 'delivered', 'Remise confirmée avec le code client');
end $$;
revoke all on function public.driver_start(uuid), public.driver_confirm(uuid, text) from public, anon;
grant execute on function public.driver_start(uuid), public.driver_confirm(uuid, text) to authenticated;

-- ===== Service de livraison ouvert à tout compte inscrit (sans achat chez TAIPOC) =====
alter table public.deliveries alter column order_id drop not null;
alter table public.deliveries add column kind text not null default 'order' check (kind in ('order','service')),
  add column requester_id uuid references auth.users(id), add column pickup_address text check (length(pickup_address) <= 300),
  add column dropoff_address text check (length(dropoff_address) <= 300), add column description text check (length(description) <= 300),
  add column contact_phone text check (length(contact_phone) <= 20), add column fee_xof integer check (fee_xof is null or fee_xof >= 0);
alter table public.deliveries add constraint delivery_kind_ok check ((kind = 'order' and order_id is not null) or (kind = 'service' and requester_id is not null));
alter table public.deliveries drop constraint deliveries_status_check;
alter table public.deliveries add constraint deliveries_status_check check (status in ('to_assign','assigned','out','delivered','failed','cancelled'));
create policy "demandeur : ma demande" on public.deliveries for select using (requester_id = auth.uid());
create policy "demandeur : mon code" on public.delivery_codes for select using (exists (select 1 from public.deliveries d where d.id = delivery_id and d.requester_id = auth.uid()));

create function public.request_delivery(p_pickup text, p_dropoff text, p_desc text, p_phone text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  if length(trim(coalesce(p_pickup,''))) < 5 or length(trim(coalesce(p_dropoff,''))) < 5 or length(trim(coalesce(p_desc,''))) < 3 then raise exception 'informations incomplètes'; end if;
  if (select count(*) from deliveries where requester_id = auth.uid() and status in ('to_assign','assigned','out')) >= 5 then raise exception 'trop de demandes en cours'; end if;
  insert into deliveries(kind, requester_id, pickup_address, dropoff_address, description, contact_phone)
    values ('service', auth.uid(), left(p_pickup, 300), left(p_dropoff, 300), left(p_desc, 300), left(p_phone, 20)) returning id into v_id;
  insert into delivery_codes(delivery_id) values (v_id);
  return v_id;
end $$;
create function public.cancel_delivery_request(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update deliveries set status = 'cancelled', updated_at = now() where id = p_id and requester_id = auth.uid() and status = 'to_assign';
  if not found then raise exception 'annulation impossible'; end if;
end $$;
revoke all on function public.request_delivery(text, text, text, text), public.cancel_delivery_request(uuid) from public, anon;
grant execute on function public.request_delivery(text, text, text, text), public.cancel_delivery_request(uuid) to authenticated;

-- Confirmation de remise : fonctionne pour les commandes et pour les demandes de service.
create or replace function public.driver_confirm(p_delivery uuid, p_code text) returns void language plpgsql security definer set search_path = public as $$
declare v_order uuid; v_ok boolean;
begin
  if not public.is_driver() then raise exception 'accès refusé'; end if;
  select true, d.order_id into v_ok, v_order from deliveries d join delivery_codes c on c.delivery_id = d.id
    where d.id = p_delivery and d.driver_id = auth.uid() and d.status = 'out' and c.code = p_code;
  if v_ok is null then raise exception 'code incorrect'; end if;
  update deliveries set status = 'delivered', delivered_at = now(), updated_at = now() where id = p_delivery;
  if v_order is not null then
    update orders set status = 'delivered' where id = v_order;
    insert into order_events(order_id, status, note) values (v_order, 'delivered', 'Remise confirmée avec le code client');
  end if;
end $$;

