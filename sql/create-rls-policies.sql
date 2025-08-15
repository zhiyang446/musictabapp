-- T15: Create RLS policies for user isolation

-- Drop existing policies
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

drop policy if exists "Users can view own jobs" on public.jobs;
drop policy if exists "Users can insert own jobs" on public.jobs;
drop policy if exists "Users can update own jobs" on public.jobs;

drop policy if exists "Users can view own artifacts" on public.artifacts;
drop policy if exists "Users can view own stems" on public.stems;
drop policy if exists "Users can view own usage logs" on public.usage_log;

-- Profiles policies: user_id = auth.uid()
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id);

-- Jobs policies: user_id = auth.uid()
create policy "Users can view own jobs" on public.jobs
  for select using (auth.uid() = user_id);

create policy "Users can insert own jobs" on public.jobs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own jobs" on public.jobs
  for update using (auth.uid() = user_id);

-- Artifacts policies: via job ownership
create policy "Users can view own artifacts" on public.artifacts
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = artifacts.job_id 
      and jobs.user_id = auth.uid()
    )
  );

-- Stems policies: via job ownership
create policy "Users can view own stems" on public.stems
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = stems.job_id 
      and jobs.user_id = auth.uid()
    )
  );

-- Usage log policies: user_id = auth.uid()
create policy "Users can view own usage logs" on public.usage_log
  for select using (auth.uid() = user_id);
