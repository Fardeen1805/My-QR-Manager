-- Run this file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Za-z0-9_-]{2,64}$'),
  title text not null default '',
  destination_url text not null check (destination_url ~* '^https?://'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists qr_codes_user_created_idx
  on public.qr_codes(user_id, created_at desc);
create index if not exists qr_codes_active_code_idx
  on public.qr_codes(code) where is_active = true;

alter table public.qr_codes enable row level security;

drop policy if exists "Owners can read their QR codes" on public.qr_codes;
create policy "Owners can read their QR codes"
  on public.qr_codes for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owners can create their QR codes" on public.qr_codes;
create policy "Owners can create their QR codes"
  on public.qr_codes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owners can update their QR codes" on public.qr_codes;
create policy "Owners can update their QR codes"
  on public.qr_codes for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owners can delete their QR codes" on public.qr_codes;
create policy "Owners can delete their QR codes"
  on public.qr_codes for delete to authenticated
  using (auth.uid() = user_id);

-- Anonymous scanners can resolve only an active code's destination.
-- They cannot list or read the QR table. The code is validated by the route too.
create or replace function public.resolve_qr_code(p_code text)
returns table(destination_url text)
language sql
security definer
set search_path = ''
stable
as $$
  select q.destination_url
  from public.qr_codes as q
  where q.code = p_code
    and q.is_active = true
  limit 1;
$$;

revoke all on function public.resolve_qr_code(text) from public;
grant execute on function public.resolve_qr_code(text) to anon, authenticated;
