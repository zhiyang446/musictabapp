-- T13: Create usage_log table according to architecture.md

-- 用量日志（可选）
create table if not exists public.usage_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid,
  seconds_processed int,                    -- 音频秒数
  gpu_seconds numeric,                      -- 推理 GPU 时间
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.usage_log enable row level security;

-- Policies
create policy "Users can view own usage logs" on public.usage_log
  for select using (auth.uid() = user_id);

-- Indexes
create index if not exists usage_log_user_id_idx on public.usage_log(user_id);
create index if not exists usage_log_created_at_idx on public.usage_log(created_at);
