-- T16: Create service role access policies for Orchestrator

-- Service role policies for backend operations
-- These allow the Orchestrator to manage jobs and artifacts

-- Jobs: Service role can insert, update, and read all jobs
create policy "Service role can manage all jobs" on public.jobs
  for all using (auth.role() = 'service_role');

-- Artifacts: Service role can insert and read all artifacts
create policy "Service role can manage all artifacts" on public.artifacts
  for all using (auth.role() = 'service_role');

-- Stems: Service role can insert and read all stems
create policy "Service role can manage all stems" on public.stems
  for all using (auth.role() = 'service_role');

-- Usage log: Service role can insert usage records
create policy "Service role can insert usage logs" on public.usage_log
  for insert with check (auth.role() = 'service_role');

create policy "Service role can read usage logs" on public.usage_log
  for select using (auth.role() = 'service_role');

-- Profiles: Service role can read profiles for user validation
create policy "Service role can read profiles" on public.profiles
  for select using (auth.role() = 'service_role');
