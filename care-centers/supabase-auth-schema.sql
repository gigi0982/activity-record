-- Supabase users table for care-centers login
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  role text not null check (role in ('superAdmin', 'financeAdmin', 'siteAdmin', 'staff')),
  site_id text not null,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_site_id on public.users(site_id);

-- ============================================================
-- 預設帳號（密碼 = 帳號名稱 + 2026，例如 sanxing2026）
-- 你之後可以在 Supabase 的 Table Editor 或 SQL Editor 修改
-- ============================================================

-- 超級管理者（可看所有據點）
insert into public.users (name, role, site_id, password_hash)
values ('admin', 'superAdmin', 'all', crypt('admin2026', gen_salt('bf')))
on conflict (name) do nothing;

-- 三星據點
insert into public.users (name, role, site_id, password_hash)
values ('sanxing', 'siteAdmin', 'sanxing', crypt('sanxing2026', gen_salt('bf')))
on conflict (name) do nothing;

-- 羅東據點
insert into public.users (name, role, site_id, password_hash)
values ('luodong', 'siteAdmin', 'luodong', crypt('luodong2026', gen_salt('bf')))
on conflict (name) do nothing;

-- 冬瓜山據點
insert into public.users (name, role, site_id, password_hash)
values ('dongguashan', 'siteAdmin', 'dongguashan', crypt('dongguashan2026', gen_salt('bf')))
on conflict (name) do nothing;

-- 礁溪據點
insert into public.users (name, role, site_id, password_hash)
values ('jiaoxi', 'siteAdmin', 'jiaoxi', crypt('jiaoxi2026', gen_salt('bf')))
on conflict (name) do nothing;

-- auto update timestamp
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();
