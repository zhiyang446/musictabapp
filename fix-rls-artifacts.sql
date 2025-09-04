-- Fix RLS policies for artifacts table to allow Service Role access

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can manage all artifacts" ON public.artifacts;

-- Create service role policy for artifacts
CREATE POLICY "Service role can manage all artifacts" ON public.artifacts
  FOR ALL USING (auth.role() = 'service_role');

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'artifacts';
