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
