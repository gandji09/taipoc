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
