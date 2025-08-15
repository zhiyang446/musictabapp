-- Create transcription_jobs table for Music Tab App
-- This table stores transcription job information and tracks processing status

CREATE TABLE IF NOT EXISTS public.transcription_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audio_file_id UUID NOT NULL REFERENCES public.audio_files(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Job configuration
    target_instrument TEXT NOT NULL CHECK (target_instrument IN ('drums', 'bass', 'guitar', 'piano', 'vocals', 'mixed')),
    output_format TEXT NOT NULL DEFAULT 'musicxml' CHECK (output_format IN ('musicxml', 'midi', 'pdf')),

    -- Processing information
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

    -- Worker information
    worker_id TEXT, -- ID of the worker processing this job
    queue_name TEXT DEFAULT 'default',
    priority INTEGER DEFAULT 0,

    -- Processing options
    options JSONB DEFAULT '{}', -- Additional processing options

    -- Results
    output_file_path TEXT, -- Path to generated transcription file
    output_file_size BIGINT,
    confidence_score NUMERIC(3,2), -- Confidence score 0.00-1.00

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Constraints
    CONSTRAINT transcription_jobs_output_file_size_check CHECK (output_file_size IS NULL OR output_file_size > 0),
    CONSTRAINT transcription_jobs_confidence_check CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    CONSTRAINT transcription_jobs_timing_check CHECK (
        (started_at IS NULL OR started_at >= created_at) AND
        (completed_at IS NULL OR (started_at IS NOT NULL AND completed_at >= started_at))
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS transcription_jobs_audio_file_id_idx ON public.transcription_jobs (audio_file_id);
CREATE INDEX IF NOT EXISTS transcription_jobs_status_idx ON public.transcription_jobs (status);
CREATE INDEX IF NOT EXISTS transcription_jobs_target_instrument_idx ON public.transcription_jobs (target_instrument);
CREATE INDEX IF NOT EXISTS transcription_jobs_created_at_idx ON public.transcription_jobs (created_at);
CREATE INDEX IF NOT EXISTS transcription_jobs_worker_id_idx ON public.transcription_jobs (worker_id);
CREATE INDEX IF NOT EXISTS transcription_jobs_queue_priority_idx ON public.transcription_jobs (queue_name, priority DESC, created_at);

-- Create updated_at trigger for transcription_jobs
CREATE TRIGGER update_transcription_jobs_updated_at
    BEFORE UPDATE ON public.transcription_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.transcription_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view transcription jobs for their own audio files
CREATE POLICY "Users can view own transcription jobs" ON public.transcription_jobs
    FOR SELECT USING (
        audio_file_id IN (
            SELECT id FROM public.audio_files WHERE user_id = auth.uid()
        )
    );

-- Users can insert transcription jobs for their own audio files
CREATE POLICY "Users can insert own transcription jobs" ON public.transcription_jobs
    FOR INSERT WITH CHECK (
        audio_file_id IN (
            SELECT id FROM public.audio_files WHERE user_id = auth.uid()
        )
    );

-- Users can update transcription jobs for their own audio files
CREATE POLICY "Users can update own transcription jobs" ON public.transcription_jobs
    FOR UPDATE USING (
        audio_file_id IN (
            SELECT id FROM public.audio_files WHERE user_id = auth.uid()
        )
    );

-- Users can delete transcription jobs for their own audio files
CREATE POLICY "Users can delete own transcription jobs" ON public.transcription_jobs
    FOR DELETE USING (
        audio_file_id IN (
            SELECT id FROM public.audio_files WHERE user_id = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.transcription_jobs IS 'Transcription jobs for processing audio files into musical notation';
COMMENT ON COLUMN public.transcription_jobs.id IS 'Primary key for transcription job';
COMMENT ON COLUMN public.transcription_jobs.audio_file_id IS 'Foreign key reference to audio_files table';
COMMENT ON COLUMN public.transcription_jobs.status IS 'Current status of the transcription job';
COMMENT ON COLUMN public.transcription_jobs.target_instrument IS 'Instrument to transcribe from the audio';
COMMENT ON COLUMN public.transcription_jobs.output_format IS 'Desired output format for transcription';
COMMENT ON COLUMN public.transcription_jobs.progress_percentage IS 'Processing progress from 0 to 100';
COMMENT ON COLUMN public.transcription_jobs.confidence_score IS 'AI confidence score for transcription accuracy';
COMMENT ON COLUMN public.transcription_jobs.output_file_path IS 'Path to the generated transcription file';
COMMENT ON COLUMN public.transcription_jobs.options IS 'Additional processing options as JSON';
COMMENT ON COLUMN public.transcription_jobs.metadata IS 'Additional job metadata as JSON';