-- T17: Create performance indexes

-- Jobs table: Composite index for user queries with time ordering
create index if not exists jobs_user_created_desc_idx 
  on public.jobs(user_id, created_at desc);

-- Artifacts table: Index for job relationship queries
create index if not exists artifacts_job_id_idx 
  on public.artifacts(job_id);

-- Stems table: Index for job relationship queries  
create index if not exists stems_job_id_idx 
  on public.stems(job_id);

-- Additional useful indexes for common queries
create index if not exists jobs_status_idx 
  on public.jobs(status);

create index if not exists artifacts_kind_idx 
  on public.artifacts(kind);

create index if not exists usage_log_user_created_idx 
  on public.usage_log(user_id, created_at desc);

-- Verify indexes created
select 
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes 
where schemaname = 'public' 
  and tablename in ('jobs', 'artifacts', 'stems', 'usage_log')
order by tablename, indexname;
