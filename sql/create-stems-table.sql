-- T12: Create stems table according to architecture.md

-- stems（可选）：分离后的音轨
create table if not exists public.stems (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  stem text not null,                       -- 'drums'|'bass'|'other'...
  storage_path text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.stems enable row level security;

-- Policies
create policy "Users can view own stems" on public.stems
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = stems.job_id 
      and jobs.user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists stems_job_id_idx on public.stems(job_id);
create index if not exists stems_stem_idx on public.stems(stem);
