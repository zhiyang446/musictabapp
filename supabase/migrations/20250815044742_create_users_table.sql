-- Create users table for Music Tab App
-- This table stores user profile information and extends Supabase auth.users

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Additional user profile fields
    display_name TEXT,
    avatar_url TEXT,

    -- User preferences
    preferred_language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',

    -- Subscription and usage tracking
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    monthly_usage_seconds INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_monthly_usage_check CHECK (monthly_usage_seconds >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS users_subscription_tier_idx ON public.users (subscription_tier);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON public.users (created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (will be refined in later tasks)
-- Users can read their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own data (for registration)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Add comments for documentation
COMMENT ON TABLE public.users IS 'User profiles and preferences for Music Tab App';
COMMENT ON COLUMN public.users.id IS 'Primary key, should match auth.users.id';
COMMENT ON COLUMN public.users.email IS 'User email address, must be unique';
COMMENT ON COLUMN public.users.subscription_tier IS 'User subscription level: free, pro, or enterprise';
COMMENT ON COLUMN public.users.monthly_usage_seconds IS 'Seconds of audio processed this month';
COMMENT ON COLUMN public.users.metadata IS 'Additional user data as JSON';