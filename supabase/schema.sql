-- TAIPOC : schéma initial. À exécuter dans Supabase > SQL Editor.
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique not null, position int default 0
);
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id),
  name text not null, description text,
  price_xof integer not null check (price_xof >= 0),
  old_price_xof integer check (old_price_xof is null or old_price_xof > price_xof),
  shipping_note text default 'Hors frais d''expédition',
  image_url text, is_active boolean default true, is_new boolean default false,
  created_at timestamptz default now()
);
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, is_admin boolean default false
);
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','ordered_supplier','shipped','in_transit','arrived_benin','delivered','cancelled')),
  delivery_mode text check (delivery_mode in ('home','pickup')),
  delivery_address text, total_xof integer not null,
  fedapay_transaction_id text, created_at timestamptz default now()
);
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity int not null check (quantity > 0), unit_price_xof integer not null
);
-- Une étape de suivi n'existe que si l'équipe l'a confirmée.
create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  status text not null, note text, created_at timestamptz default now()
);

alter table categories enable row level security;
alter table products enable row level security;
alter table profiles enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_events enable row level security;

create function is_admin() returns boolean language sql security definer as
$$ select coalesce((select is_admin from profiles where id = auth.uid()), false) $$;

create policy "catalogue public" on categories for select using (true);
create policy "produits actifs publics" on products for select using (is_active or is_admin());
create policy "admin gère catégories" on categories for all using (is_admin());
create policy "admin gère produits" on products for all using (is_admin());
create policy "profil personnel" on profiles for select using (id = auth.uid() or is_admin());
create policy "profil modifiable" on profiles for update using (id = auth.uid());
create policy "mes commandes" on orders for select using (user_id = auth.uid() or is_admin());
create policy "créer ma commande" on orders for insert with check (user_id = auth.uid());
create policy "admin met à jour commandes" on orders for update using (is_admin());
create policy "mes lignes" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "mon suivi" on order_events for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "admin écrit suivi" on order_events for insert with check (is_admin());
