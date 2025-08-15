-- T11: Create artifacts table according to architecture.md

-- artifacts：输出制品（一个任务多产物）
create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  kind text not null,                       -- 'midi' | 'musicxml' | 'pdf' | 'preview'
  instrument text,                          -- 'drums'/'bass'/... 或 'mix'/'chords'
  storage_path text not null,
  bytes int,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.artifacts enable row level security;

-- Policies
create policy "Users can view own artifacts" on public.artifacts
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = artifacts.job_id 
      and jobs.user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists artifacts_job_id_idx on public.artifacts(job_id);
create index if not exists artifacts_kind_idx on public.artifacts(kind);
