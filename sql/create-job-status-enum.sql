-- T09: Create job_status enumeration type
-- Execute this SQL in Supabase SQL Editor

-- Create job_status enumeration with all required values
create type job_status as enum (
  'PENDING',
  'QUEUED', 
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELED'
);

-- Verify enumeration creation
-- This should return 6 items as per DoD requirement
select unnest(enum_range(null::job_status)) as status_value;

-- Additional verification: Get enum information
select 
  t.typname as enum_name,
  e.enumlabel as enum_value,
  e.enumsortorder as sort_order
from pg_type t 
join pg_enum e on t.oid = e.enumtypid  
where t.typname = 'job_status'
order by e.enumsortorder;
