-- Create audio_files table for Music Tab App
-- This table stores information about uploaded audio files

CREATE TABLE IF NOT EXISTS public.audio_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    upload_status TEXT NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- File metadata
    original_filename TEXT NOT NULL,
    mime_type TEXT,
    duration_seconds NUMERIC(10,3), -- Duration in seconds with millisecond precision

    -- Storage information
    storage_path TEXT, -- Path in Supabase Storage
    storage_bucket TEXT DEFAULT 'audio-files',

    -- Processing information
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,

    -- Audio file properties
    sample_rate INTEGER,
    bit_depth INTEGER,
    channels INTEGER,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Constraints
    CONSTRAINT audio_files_file_size_check CHECK (file_size > 0),
    CONSTRAINT audio_files_duration_check CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    CONSTRAINT audio_files_sample_rate_check CHECK (sample_rate IS NULL OR sample_rate > 0),
    CONSTRAINT audio_files_channels_check CHECK (channels IS NULL OR channels > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS audio_files_user_id_idx ON public.audio_files (user_id);
CREATE INDEX IF NOT EXISTS audio_files_upload_status_idx ON public.audio_files (upload_status);
CREATE INDEX IF NOT EXISTS audio_files_processing_status_idx ON public.audio_files (processing_status);
CREATE INDEX IF NOT EXISTS audio_files_created_at_idx ON public.audio_files (created_at);
CREATE INDEX IF NOT EXISTS audio_files_filename_idx ON public.audio_files (filename);

-- Create updated_at trigger for audio_files
CREATE TRIGGER update_audio_files_updated_at
    BEFORE UPDATE ON public.audio_files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own audio files
CREATE POLICY "Users can view own audio files" ON public.audio_files
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own audio files
CREATE POLICY "Users can insert own audio files" ON public.audio_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own audio files
CREATE POLICY "Users can update own audio files" ON public.audio_files
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own audio files
CREATE POLICY "Users can delete own audio files" ON public.audio_files
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.audio_files IS 'Audio files uploaded by users for transcription';
COMMENT ON COLUMN public.audio_files.id IS 'Primary key for audio file record';
COMMENT ON COLUMN public.audio_files.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN public.audio_files.filename IS 'Generated filename for storage';
COMMENT ON COLUMN public.audio_files.original_filename IS 'Original filename from user upload';
COMMENT ON COLUMN public.audio_files.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.audio_files.upload_status IS 'Status of file upload process';
COMMENT ON COLUMN public.audio_files.processing_status IS 'Status of audio processing/transcription';
COMMENT ON COLUMN public.audio_files.duration_seconds IS 'Audio duration in seconds';
COMMENT ON COLUMN public.audio_files.storage_path IS 'Path to file in Supabase Storage';
COMMENT ON COLUMN public.audio_files.metadata IS 'Additional file metadata as JSON';