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
