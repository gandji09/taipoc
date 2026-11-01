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
