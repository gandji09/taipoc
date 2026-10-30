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
