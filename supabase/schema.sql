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

-- Migration 02 : branche toute l'application sur Supabase. À exécuter UNE fois dans SQL Editor (après schema.sql).
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists last_seen timestamptz;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;
insert into public.profiles (id, full_name, email) select u.id, u.raw_user_meta_data->>'full_name', u.email from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as
$$ begin insert into public.profiles (id, full_name, email) values (new.id, new.raw_user_meta_data->>'full_name', new.email) on conflict (id) do nothing; return new; end $$;

-- Les rôles ne se changent que par les fonctions admin ci-dessous (ou le SQL Editor).
create or replace function public.protect_profile() returns trigger language plpgsql security definer set search_path = public as
$$ begin if auth.uid() is not null and coalesce(current_setting('app.role_change', true), '') <> '1'
  and (new.is_admin is distinct from old.is_admin or new.is_driver is distinct from old.is_driver) then raise exception 'rôle non modifiable'; end if; return new; end $$;
create or replace function public.admin_set_driver(p_email text, p_on boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'accès refusé'; end if;
  perform set_config('app.role_change', '1', true);
  update profiles set is_driver = p_on where lower(email) = lower(trim(p_email));
  if not found then raise exception 'aucun compte inscrit avec cet e-mail'; end if;
  insert into audit_log(actor, action, detail) values (auth.uid(), 'set_driver', jsonb_build_object('email', p_email, 'on', p_on));
end $$;

-- Code de remise créé automatiquement pour chaque livraison.
create or replace function public.new_delivery_code() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into delivery_codes(delivery_id) values (new.id) on conflict do nothing; return new; end $$;
drop trigger if exists delivery_code on public.deliveries;
create trigger delivery_code after insert on public.deliveries for each row execute function public.new_delivery_code();
insert into public.delivery_codes(delivery_id) select d.id from public.deliveries d where not exists (select 1 from public.delivery_codes c where c.delivery_id = d.id);
create or replace function public.request_delivery(p_pickup text, p_dropoff text, p_desc text, p_phone text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  if length(trim(coalesce(p_pickup,''))) < 5 or length(trim(coalesce(p_dropoff,''))) < 5 or length(trim(coalesce(p_desc,''))) < 3 then raise exception 'informations incomplètes'; end if;
  if (select count(*) from deliveries where requester_id = auth.uid() and status in ('to_assign','assigned','out')) >= 5 then raise exception 'trop de demandes en cours'; end if;
  insert into deliveries(kind, requester_id, pickup_address, dropoff_address, description, contact_phone)
    values ('service', auth.uid(), left(p_pickup, 300), left(p_dropoff, 300), left(p_desc, 300), left(p_phone, 20)) returning id into v_id;
  return v_id;
end $$;
create or replace function public.driver_fail(p_delivery uuid, p_note text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_driver() then raise exception 'accès refusé'; end if;
  update deliveries set status = 'failed', note = left(p_note, 300), updated_at = now() where id = p_delivery and driver_id = auth.uid() and status in ('assigned','out');
  if not found then raise exception 'livraison introuvable'; end if;
end $$;

-- Confirmation manuelle du paiement Mobile Money par l'équipe (en attendant le webhook FedaPay).
create or replace function public.admin_confirm_payment(p_order uuid, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'accès refusé'; end if;
  update orders set status = 'paid' where id = p_order and status = 'pending_payment';
  if not found then raise exception 'commande introuvable ou déjà payée'; end if;
  insert into order_events(order_id, status, note) values (p_order, 'paid', left(coalesce(p_note, 'Paiement confirmé par l''équipe'), 300));
  insert into audit_log(actor, action, detail) values (auth.uid(), 'confirm_payment', jsonb_build_object('order', p_order));
end $$;

-- Témoignages publiés : prénom seulement, aucun autre champ privé.
create or replace view public.testimonials_public as
  select t.id, t.product_id, t.rating, t.body, t.created_at, coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Client') as author
  from public.testimonials t left join public.profiles p on p.id = t.user_id where t.status = 'approved';
grant select on public.testimonials_public to anon, authenticated;

revoke all on function public.admin_set_driver(text, boolean), public.driver_fail(uuid, text), public.admin_confirm_payment(uuid, text), public.request_delivery(text, text, text, text) from public, anon;
grant execute on function public.admin_set_driver(text, boolean), public.driver_fail(uuid, text), public.admin_confirm_payment(uuid, text), public.request_delivery(text, text, text, text) to authenticated;
-- Migration 03 : toute action d'administration exige la double authentification (niveau aal2).
-- Même un mot de passe volé ne suffit plus : la base refuse sans le code à 6 chiffres.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false) and coalesce(auth.jwt() ->> 'aal', '') = 'aal2' $$;
-- Migration 04 : tailles des produits, choix enregistré dans chaque commande, refus des produits indisponibles.
alter table public.products add column if not exists sizes text[] not null default '{}';
alter table public.order_items add column if not exists variant text, add column if not exists size text;
create or replace function public.create_order(p_items jsonb, p_mode text, p_address text, p_phone text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_order uuid; v_total int := 0; r record; v_price int; v_sizes text[]; v_vars text[];
begin
  if v_uid is null then raise exception 'connexion requise'; end if;
  if p_mode not in ('home','pickup') then raise exception 'mode de livraison invalide'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'panier invalide'; end if;
  insert into orders(user_id, delivery_mode, delivery_address, delivery_phone) values (v_uid, p_mode, left(p_address, 300), left(p_phone, 20)) returning id into v_order;
  for r in select (e->>'product_id')::uuid as pid, (e->>'qty')::int as qty, nullif(trim(e->>'variant'), '') as variant, nullif(trim(e->>'size'), '') as size from jsonb_array_elements(p_items) e loop
    if r.qty is null or r.qty < 1 or r.qty > 100 then raise exception 'quantité invalide'; end if;
    select price_xof, sizes, variants into v_price, v_sizes, v_vars from products where id = r.pid and is_active and stock_status <> 'Indisponible';
    if v_price is null then raise exception 'produit indisponible'; end if;
    if coalesce(array_length(v_sizes, 1), 0) > 0 and (r.size is null or not (r.size = any(v_sizes))) then raise exception 'taille requise ou invalide'; end if;
    if coalesce(array_length(v_vars, 1), 0) > 0 and (r.variant is null or not (r.variant = any(v_vars))) then raise exception 'option invalide'; end if;
    insert into order_items(order_id, product_id, quantity, unit_price_xof, variant, size) values (v_order, r.pid, r.qty, v_price, r.variant, r.size);
    v_total := v_total + v_price * r.qty;
  end loop;
  update orders set total_xof = v_total where id = v_order;
  insert into order_events(order_id, status, note) values (v_order, 'pending_payment', 'Commande créée');
  return v_order;
end $$;
-- Migration 05 : base pour la répartition des frais de service (80 % livreur, 20 % TAIPOC).
-- Le compte de paiement du livreur (sous-compte FedaPay Marketplace) est visible de l'admin et du livreur concerné seulement.
create table if not exists public.driver_accounts (driver_id uuid primary key references auth.users(id) on delete cascade, fedapay_account_id text, updated_at timestamptz default now());
alter table public.driver_accounts enable row level security;
drop policy if exists "admin gère comptes livreurs" on public.driver_accounts;
drop policy if exists "livreur voit son compte" on public.driver_accounts;
create policy "admin gère comptes livreurs" on public.driver_accounts for all using (public.is_admin()) with check (public.is_admin());
create policy "livreur voit son compte" on public.driver_accounts for select using (driver_id = auth.uid());
-- Suivi du paiement de chaque livraison. Ces colonnes seront écrites uniquement par le serveur (webhook FedaPay), jamais par le navigateur.
alter table public.deliveries add column if not exists payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded'));
alter table public.deliveries add column if not exists paid_at timestamptz;
alter table public.deliveries add column if not exists fedapay_transaction_id text unique;
alter table public.deliveries add column if not exists driver_share_xof integer;
alter table public.deliveries add column if not exists platform_share_xof integer;
-- Migration 06 : tarifs par zone, profil du livreur visible du client, avis après livraison.
create table if not exists public.delivery_zones (id uuid primary key default gen_random_uuid(), name text not null unique check (length(name) between 2 and 80), fee_xof integer not null check (fee_xof >= 0), is_active boolean not null default true, position int not null default 0);
alter table public.delivery_zones enable row level security;
drop policy if exists "zones actives" on public.delivery_zones; drop policy if exists "admin zones" on public.delivery_zones;
create policy "zones actives" on public.delivery_zones for select using (is_active or public.is_admin());
create policy "admin zones" on public.delivery_zones for all using (public.is_admin()) with check (public.is_admin());
alter table public.deliveries add column if not exists zone_id uuid references public.delivery_zones(id) on delete set null, add column if not exists zone_name text;
alter table public.driver_accounts add column if not exists photo_url text;

create table if not exists public.delivery_ratings (delivery_id uuid primary key references public.deliveries(id) on delete cascade, driver_id uuid not null references auth.users(id), user_id uuid not null references auth.users(id),
  rating int not null check (rating between 1 and 5), comment text check (length(comment) <= 300), created_at timestamptz default now());
alter table public.delivery_ratings enable row level security;
drop policy if exists "mon avis" on public.delivery_ratings; drop policy if exists "avis admin" on public.delivery_ratings; drop policy if exists "avis livreur" on public.delivery_ratings;
create policy "mon avis" on public.delivery_ratings for select using (user_id = auth.uid());
create policy "avis admin" on public.delivery_ratings for select using (public.is_admin());
create policy "avis livreur" on public.delivery_ratings for select using (driver_id = auth.uid());

-- Le tarif vient de la zone choisie, jamais du navigateur.
drop function if exists public.request_delivery(text, text, text, text);
create or replace function public.request_delivery(p_pickup text, p_dropoff text, p_desc text, p_phone text, p_zone uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_fee int; v_zname text;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  if length(trim(coalesce(p_pickup,''))) < 5 or length(trim(coalesce(p_dropoff,''))) < 5 or length(trim(coalesce(p_desc,''))) < 3 then raise exception 'informations incomplètes'; end if;
  if (select count(*) from deliveries where requester_id = auth.uid() and status in ('to_assign','assigned','out')) >= 5 then raise exception 'trop de demandes en cours'; end if;
  if p_zone is not null then
    select fee_xof, name into v_fee, v_zname from delivery_zones where id = p_zone and is_active;
    if v_fee is null then raise exception 'zone invalide'; end if;
  elsif exists (select 1 from delivery_zones where is_active) then raise exception 'zone requise'; end if;
  insert into deliveries(kind, requester_id, pickup_address, dropoff_address, description, contact_phone, fee_xof, zone_id, zone_name)
    values ('service', auth.uid(), left(p_pickup, 300), left(p_dropoff, 300), left(p_desc, 300), left(p_phone, 20), v_fee, p_zone, v_zname) returning id into v_id;
  return v_id;
end $$;

-- Ce que le client voit de son livreur : prénom, photo, note moyenne. Rien d'autre.
create or replace function public.delivery_driver_info(p_delivery uuid) returns table(first_name text, photo_url text, avg_rating numeric, rated_count int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from deliveries d left join orders o on o.id = d.order_id where d.id = p_delivery and (d.requester_id = auth.uid() or o.user_id = auth.uid())) then return; end if;
  return query select coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Livreur'), a.photo_url,
    (select round(avg(r.rating)::numeric, 1) from delivery_ratings r where r.driver_id = d.driver_id), (select count(*)::int from delivery_ratings r where r.driver_id = d.driver_id)
    from deliveries d join profiles p on p.id = d.driver_id left join driver_accounts a on a.driver_id = d.driver_id where d.id = p_delivery and d.driver_id is not null;
end $$;
create or replace function public.rate_delivery(p_delivery uuid, p_rating int, p_comment text default null) returns void language plpgsql security definer set search_path = public as $$
declare v_driver uuid;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  select d.driver_id into v_driver from deliveries d left join orders o on o.id = d.order_id where d.id = p_delivery and d.status = 'delivered' and (d.requester_id = auth.uid() or o.user_id = auth.uid());
  if v_driver is null then raise exception 'avis impossible : livraison non terminée'; end if;
  insert into delivery_ratings(delivery_id, driver_id, user_id, rating, comment) values (p_delivery, v_driver, auth.uid(), p_rating, left(p_comment, 300));
end $$;
revoke all on function public.request_delivery(text, text, text, text, uuid), public.delivery_driver_info(uuid), public.rate_delivery(uuid, int, text) from public, anon;
grant execute on function public.request_delivery(text, text, text, text, uuid), public.delivery_driver_info(uuid), public.rate_delivery(uuid, int, text) to authenticated;
-- Migration 07 : disponibilité des livreurs, livraisons à prendre, limite de 3 livraisons en même temps.
alter table public.driver_accounts add column if not exists available boolean not null default false, add column if not exists available_at timestamptz;
create or replace function public.set_availability(p_on boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_driver() then raise exception 'accès refusé'; end if;
  insert into driver_accounts(driver_id, available, available_at) values (auth.uid(), p_on, now())
    on conflict (driver_id) do update set available = p_on, available_at = now();
end $$;
-- Un livreur disponible voit seulement la zone, le tarif et un court descriptif : jamais l'adresse ni le téléphone avant d'avoir accepté.
create or replace function public.open_deliveries() returns table(id uuid, zone_name text, fee_xof integer, description text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_driver() then return; end if;
  if not coalesce((select a.available from driver_accounts a where a.driver_id = auth.uid()), false) then return; end if;
  return query select d.id, d.zone_name, d.fee_xof, left(d.description, 80) from deliveries d where d.kind = 'service' and d.status = 'to_assign' and d.driver_id is null order by d.updated_at;
end $$;
-- Le premier qui accepte la prend : la mise à jour est atomique, deux livreurs ne peuvent pas prendre la même livraison.
create or replace function public.driver_accept(p_delivery uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_driver() then raise exception 'accès refusé'; end if;
  if not coalesce((select a.available from driver_accounts a where a.driver_id = auth.uid()), false) then raise exception 'activez votre disponibilité'; end if;
  if (select count(*) from deliveries where driver_id = auth.uid() and status in ('assigned','out')) >= 3 then raise exception 'maximum 3 livraisons en même temps'; end if;
  update deliveries set driver_id = auth.uid(), status = 'assigned', updated_at = now() where id = p_delivery and kind = 'service' and status = 'to_assign' and driver_id is null;
  if not found then raise exception 'livraison déjà prise'; end if;
end $$;
revoke all on function public.set_availability(boolean), public.open_deliveries(), public.driver_accept(uuid) from public, anon;
grant execute on function public.set_availability(boolean), public.open_deliveries(), public.driver_accept(uuid) to authenticated;
-- Migration 08 : demandes de devis par lien produit.
alter table public.order_items add column if not exists item_name text;
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  link text not null check (link ~* '^https?://' and length(link) <= 1000), title text check (length(title) <= 200), details text check (length(details) <= 500),
  quantity int not null default 1 check (quantity between 1 and 1000),
  status text not null default 'new' check (status in ('new','quoted','accepted','declined','unavailable','cancelled')),
  unit_price_xof int check (unit_price_xof >= 0), shipping_xof int check (shipping_xof >= 0), lead_time_days int check (lead_time_days >= 0), quote_note text check (length(quote_note) <= 500),
  order_id uuid references public.orders(id), created_at timestamptz default now(), updated_at timestamptz default now());
alter table public.quote_requests enable row level security;
drop policy if exists "mes devis" on public.quote_requests; drop policy if exists "admin devis" on public.quote_requests;
create policy "mes devis" on public.quote_requests for select using (user_id = auth.uid() or public.is_admin());
create policy "admin devis" on public.quote_requests for all using (public.is_admin()) with check (public.is_admin());
-- Pas d'INSERT/UPDATE direct pour le client : tout passe par les fonctions ci-dessous (limites et prix contrôlés par le serveur).
create or replace function public.request_quote(p_link text, p_title text, p_details text, p_qty int) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  if p_link !~* '^https?://' or length(p_link) > 1000 then raise exception 'lien invalide'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 1000 then raise exception 'quantité invalide'; end if;
  if (select count(*) from quote_requests where user_id = auth.uid() and status in ('new','quoted')) >= 10 then raise exception 'trop de demandes en cours'; end if;
  insert into quote_requests(user_id, link, title, details, quantity) values (auth.uid(), trim(p_link), left(p_title, 200), left(p_details, 500), p_qty) returning id into v_id;
  return v_id;
end $$;
create or replace function public.cancel_quote(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin update quote_requests set status = 'cancelled', updated_at = now() where id = p_id and user_id = auth.uid() and status in ('new','quoted'); if not found then raise exception 'annulation impossible'; end if; end $$;
-- Accepter un devis crée la commande au prix du devis ; refuser le clôt.
create or replace function public.respond_quote(p_id uuid, p_accept boolean, p_mode text default null, p_address text default null, p_phone text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare q record; v_order uuid;
begin
  select * into q from quote_requests where id = p_id and user_id = auth.uid() for update;
  if not found or q.status <> 'quoted' or q.unit_price_xof is null then raise exception 'devis introuvable ou déjà traité'; end if;
  if not p_accept then update quote_requests set status = 'declined', updated_at = now() where id = p_id; return null; end if;
  if p_mode not in ('home','pickup') then raise exception 'mode de livraison invalide'; end if;
  insert into orders(user_id, status, delivery_mode, delivery_address, delivery_phone, total_xof, shipping_xof)
    values (auth.uid(), 'pending_payment', p_mode, left(p_address, 300), left(p_phone, 20), q.unit_price_xof * q.quantity, q.shipping_xof) returning id into v_order;
  insert into order_items(order_id, product_id, quantity, unit_price_xof, item_name, variant) values (v_order, null, q.quantity, q.unit_price_xof, left(coalesce(nullif(q.title, ''), q.link), 200), nullif(q.details, ''));
  insert into order_events(order_id, status, note) values (v_order, 'pending_payment', 'Commande créée depuis un devis');
  update quote_requests set status = 'accepted', order_id = v_order, updated_at = now() where id = p_id;
  return v_order;
end $$;
revoke all on function public.request_quote(text, text, text, int), public.cancel_quote(uuid), public.respond_quote(uuid, boolean, text, text, text) from public, anon;
grant execute on function public.request_quote(text, text, text, int), public.cancel_quote(uuid), public.respond_quote(uuid, boolean, text, text, text) to authenticated;
