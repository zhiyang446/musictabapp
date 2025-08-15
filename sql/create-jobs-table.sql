-- T10: Create jobs table according to architecture.md

-- jobs：任务编排
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,                -- 'upload' | 'youtube'
  source_object_path text,                  -- Storage 路径（上传模式）
  youtube_url text,                         -- 链接模式
  instruments text[] not null,              -- ['drums','bass','guitar','piano','chords']
  options jsonb default '{}'::jsonb,        -- 分离/精度/阈值等
  status job_status not null default 'PENDING',
  progress int default 0,                   -- 0-100
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.jobs enable row level security;

-- Policies
create policy "Users can view own jobs" on public.jobs
  for select using (auth.uid() = user_id);

create policy "Users can insert own jobs" on public.jobs
  for insert with check (auth.uid() = user_id);

-- Indexes
create index if not exists jobs_user_id_idx on public.jobs(user_id);
create index if not exists jobs_status_idx on public.jobs(status);
