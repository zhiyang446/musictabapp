-- T14: Enable RLS on all tables

-- Ensure RLS is enabled on all tables
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.artifacts enable row level security;
alter table public.stems enable row level security;
alter table public.usage_log enable row level security;

-- Drop existing policies to recreate them properly
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can view own jobs" on public.jobs;
drop policy if exists "Users can view own artifacts" on public.artifacts;
drop policy if exists "Users can view own stems" on public.stems;
drop policy if exists "Users can view own usage logs" on public.usage_log;

-- Create strict RLS policies that require authentication
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);

create policy "Users can view own jobs" on public.jobs
  for select using (auth.uid() = user_id);

create policy "Users can view own artifacts" on public.artifacts
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = artifacts.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can view own stems" on public.stems
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = stems.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can view own usage logs" on public.usage_log
  for select using (auth.uid() = user_id);

-- Verify RLS is enabled
select 
  schemaname,
  tablename,
  rowsecurity
from pg_tables 
where schemaname = 'public' 
  and tablename in ('profiles', 'jobs', 'artifacts', 'stems', 'usage_log');
