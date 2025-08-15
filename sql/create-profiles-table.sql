-- T08: Create profiles table according to architecture.md
-- Execute this SQL in Supabase SQL Editor

-- profiles：用户扩展信息
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  tier text default 'free',                 -- free / pro / enterprise
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policies for profiles table
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = user_id);

-- Create index for better performance
create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists profiles_tier_idx on public.profiles(tier);
create index if not exists profiles_created_at_idx on public.profiles(created_at);

-- Verify table creation
select 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns 
where table_schema = 'public' 
  and table_name = 'profiles'
order by ordinal_position;
