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
