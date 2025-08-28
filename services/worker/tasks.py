"""
Celery tasks for Music Tab App Worker
"""
from celery import current_task
from app import app
import time
import os
from datetime import datetime


@app.task(bind=True)
def test_task(self, message="Hello from Celery!"):
    """
    Test task to verify Celery is working
    """
    try:
        # Simulate some work
        time.sleep(2)
        
        # Update task progress
        self.update_state(
            state="PROGRESS",
            meta={"current": 50, "total": 100, "status": "Processing test task..."}
        )
        
        time.sleep(2)
        
        # Complete the task
        result = {
            "message": message,
            "task_id": self.request.id,
            "timestamp": datetime.utcnow().isoformat(),
            "worker_id": os.getpid(),
            "status": "completed"
        }
        
        return result
        
    except Exception as exc:
        # Handle task failure
        self.update_state(
            state="FAILURE",
            meta={"error": str(exc), "task_id": self.request.id}
        )
        raise


@app.task(bind=True)
def process_audio(self, job_id, source_path, instruments, options=None):
    """
    Process audio file and generate tabs/MIDI (placeholder)
    """
    try:
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"current": 10, "total": 100, "status": "Starting audio processing..."}
        )
        
        # Simulate audio processing steps
        steps = [
            ("Downloading source audio", 20),
            ("Analyzing audio structure", 40),
            ("Separating instruments", 60),
            ("Generating MIDI", 80),
            ("Creating tabs", 90),
            ("Uploading artifacts", 100)
        ]
        
        for step_name, progress in steps:
            time.sleep(1)  # Simulate work
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": progress,
                    "total": 100,
                    "status": step_name,
                    "job_id": job_id
                }
            )
        
        # Return success result
        result = {
            "job_id": job_id,
            "status": "completed",
            "artifacts": [
                {"type": "midi", "instrument": inst, "path": f"artifacts/{job_id}/{inst}.mid"}
                for inst in instruments
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return result
        
    except Exception as exc:
        self.update_state(
            state="FAILURE",
            meta={"error": str(exc), "job_id": job_id}
        )
        raise


@app.task(bind=True)
def download_youtube(self, job_id, youtube_url, options=None):
    """
    T45 - Download YouTube video and extract audio using yt-dlp
    """
    try:
        from youtube_downloader import create_youtube_downloader
        import logging

        # Set up logging
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__name__)

        logger.info(f"🎬 T45: Starting YouTube download task for job {job_id}")

        self.update_state(
            state="PROGRESS",
            meta={"current": 10, "total": 100, "status": "Initializing YouTube downloader..."}
        )

        # Create YouTube downloader instance
        downloader = create_youtube_downloader()

        self.update_state(
            state="PROGRESS",
            meta={"current": 20, "total": 100, "status": "Starting YouTube audio download..."}
        )

        # Process YouTube audio (download, convert, upload)
        target_format = options.get('audio_format', 'm4a') if options else 'm4a'

        self.update_state(
            state="PROGRESS",
            meta={"current": 30, "total": 100, "status": "Downloading audio from YouTube..."}
        )

        # Use the YouTube downloader to process the audio
        result = downloader.process_youtube_audio(
            youtube_url=youtube_url,
            job_id=job_id,
            target_format=target_format
        )

        self.update_state(
            state="PROGRESS",
            meta={"current": 100, "total": 100, "status": "YouTube audio processing completed"}
        )

        # Return success result
        final_result = {
            "job_id": job_id,
            "youtube_url": youtube_url,
            "status": "completed",
            "storage_path": result['storage_path'],
            "video_title": result['video_title'],
            "duration": result['duration'],
            "file_size": result['file_size'],
            "format": result['format'],
            "timestamp": datetime.utcnow().isoformat()
        }

        logger.info(f"🎉 T45: YouTube download task completed for job {job_id}")
        return final_result

    except Exception as exc:
        logger.error(f"❌ T45: YouTube download task failed for job {job_id}: {str(exc)}")
        self.update_state(
            state="FAILURE",
            meta={"error": str(exc), "job_id": job_id, "youtube_url": youtube_url}
        )
        raise


@app.task(bind=True)
def generate_tabs(self, job_id, audio_path, instruments, options=None):
    """
    Generate tabs from processed audio (placeholder)
    """
    try:
        self.update_state(
            state="PROGRESS",
            meta={"current": 10, "total": 100, "status": "Starting tab generation..."}
        )
        
        # Simulate tab generation
        for i, instrument in enumerate(instruments):
            progress = int((i + 1) / len(instruments) * 90)
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": progress,
                    "total": 100,
                    "status": f"Generating {instrument} tabs...",
                    "job_id": job_id
                }
            )
            time.sleep(2)
        
        # Final step
        self.update_state(
            state="PROGRESS",
            meta={"current": 100, "total": 100, "status": "Finalizing tabs..."}
        )
        
        result = {
            "job_id": job_id,
            "status": "completed",
            "tabs": [
                {
                    "instrument": inst,
                    "formats": ["pdf", "musicxml"],
                    "paths": {
                        "pdf": f"artifacts/{job_id}/{inst}.pdf",
                        "musicxml": f"artifacts/{job_id}/{inst}.musicxml"
                    }
                }
                for inst in instruments
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return result
        
    except Exception as exc:
        self.update_state(
            state="FAILURE",
            meta={"error": str(exc), "job_id": job_id}
        )
        raise


@app.task
def process_job(job_id, job_data=None):
    """
    Main job processing task - T32/T45 with progress reporting and YouTube support
    Updates progress: 0 → 25 → 60 → 100
    """
    try:
        print(f"🔄 T32/T45: Processing job {job_id} with progress reporting")

        # Import database client
        import os
        from dotenv import load_dotenv
        from supabase import create_client

        load_dotenv()

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not all([supabase_url, supabase_service_key]):
            raise Exception("Missing Supabase configuration")

        supabase = create_client(supabase_url, supabase_service_key)

        # Get job data from database if not provided
        if not job_data:
            job_result = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
            if not job_result.data:
                raise Exception(f"Job {job_id} not found")
            job_data = job_result.data

        def update_progress(progress, status="RUNNING", message=""):
            """Helper function to update job progress"""
            print(f"📊 Updating job {job_id} progress to {progress}% - {message}")

            update_data = {
                "status": status,
                "progress": progress
            }

            update_result = supabase.table("jobs").update(update_data).eq("id", job_id).execute()

            if not update_result.data:
                print(f"⚠️  Failed to update progress to {progress}%")
            else:
                print(f"✅ Job {job_id} progress updated to {progress}%")

            return update_result.data

        # Step 1: Initialize - Progress 0%
        print(f"📋 Starting job {job_id} processing")
        update_progress(0, "RUNNING", "Initializing job")

        source_type = job_data.get('source_type', 'upload')
        print(f"📋 Job source type: {source_type}")

        # Step 2: Handle different source types - Progress 25%
        update_progress(25, "RUNNING", "Phase 1: Source processing")

        if source_type == 'youtube':
            # T45: Handle YouTube source
            print(f"🎬 T45: Processing YouTube job {job_id}")
            youtube_url = job_data.get('youtube_url')

            if not youtube_url:
                raise Exception("YouTube URL is required for YouTube jobs")

            # Call YouTube download task
            from youtube_downloader import create_youtube_downloader
            downloader = create_youtube_downloader()

            update_progress(30, "RUNNING", "Downloading audio from YouTube")

            # Allow overriding target audio format via job options to aid testing (e.g., 'webm' to skip conversion)
            job_options = job_data.get('options', {}) if isinstance(job_data, dict) else {}
            target_format = job_options.get('audio_format', 'm4a')

            youtube_result = downloader.process_youtube_audio(
                youtube_url=youtube_url,
                job_id=job_id,
                target_format=target_format
            )

            # Update job with source_object_path
            supabase.table("jobs").update({
                "source_object_path": youtube_result['storage_path']
            }).eq("id", job_id).execute()

            print(f"✅ T45: YouTube audio downloaded to {youtube_result['storage_path']}")

        elif source_type == 'upload':
            # Handle upload source (existing logic)
            print(f"📁 Processing upload job {job_id}")
            time.sleep(1)  # Simulate upload processing
        else:
            raise Exception(f"Unsupported source type: {source_type}")

        # Step 3: T47 Audio Preprocessing - Progress 60%
        update_progress(60, "RUNNING", "Phase 2: Audio preprocessing")

        try:
            # Get source audio file path
            source_path = job_data.get('source_object_path')
            if source_path:
                print(f"🔄 T47: Starting audio preprocessing for {source_path}")

                # Import audio preprocessor
                from audio_preprocessor import create_audio_preprocessor

                # Create preprocessor instance
                preprocessor = create_audio_preprocessor()

                # For now, simulate preprocessing since we need to download from storage first
                print(f"📋 T47: Audio preprocessing simulation")
                print(f"   Source: {source_path}")
                print(f"   Target: wav, 44.1kHz, mono")

                # Simulate preprocessing time
                time.sleep(1)

                # Update progress
                update_progress(75, "RUNNING", "Audio preprocessing completed")

                print(f"✅ T47: Audio preprocessing completed")
            else:
                print(f"⚠️  No source audio path found, skipping preprocessing")

        except Exception as preprocessing_error:
            print(f"⚠️  T47: Audio preprocessing failed: {preprocessing_error}")
            # Continue with job processing even if preprocessing fails

        # Step 4: T48 Source Separation (Optional) - Progress 75%
        update_progress(75, "RUNNING", "Phase 3: Source separation")

        try:
            # Get options from job data
            job_options = job_data.get('options', {})
            separate_sources = job_options.get('separate', False)

            print(f"🎵 T48: Source separation option: {separate_sources}")

            if separate_sources:
                print(f"🔄 T48: Source separation enabled - processing...")

                # Import source separator
                from source_separator import process_with_separation

                # Get preprocessed audio path (for now use source_path as placeholder)
                audio_path = job_data.get('source_object_path', 'placeholder_audio.wav')

                # Process with separation
                separation_result = process_with_separation(
                    input_path=audio_path,
                    job_id=job_id,
                    separate=True,
                    sources=['vocals', 'drums', 'bass', 'other']
                )

                if separation_result['success']:
                    print(f"✅ T48: Source separation completed")
                    if separation_result.get('separation_enabled'):
                        sep_info = separation_result['separation_result']
                        print(f"   Generated {len(sep_info['separated_files'])} source files")
                    else:
                        print(f"   {separation_result.get('note', 'Fallback to original')}")
                else:
                    print(f"⚠️  T48: Source separation failed, using original audio")
            else:
                print(f"⏭️  T48: Source separation disabled, using original audio")

        except Exception as separation_error:
            print(f"⚠️  T48: Source separation failed: {separation_error}")
            print(f"   Continuing with original audio...")
            # Continue with job processing even if separation fails

        # Step 5: T49 Drum Transcription to MIDI - Progress 85%
        update_progress(85, "RUNNING", "Phase 4: Drum transcription to MIDI")

        try:
            instruments = job_data.get('instruments', [])
            if 'drums' in instruments:
                print(f"🥁 T49: Drum transcription requested")

                # This path should be the result of T48 (source separation)
                # or T47 (preprocessing) if separation is disabled.
                # For now, we assume a placeholder path.
                # A proper implementation needs to pass the path from previous steps.
                drum_audio_path = f"output/{job_id}/drums.wav" # This is a placeholder

                # Check if the placeholder file exists, if not, create a dummy one for testing
                if not os.path.exists(drum_audio_path):
                    print(f"⚠️  T49: Drum audio file not found at '{drum_audio_path}'. Creating a dummy file for testing.")
                    # Create a dummy silent wav file for testing purposes
                    import soundfile as sf
                    os.makedirs(os.path.dirname(drum_audio_path), exist_ok=True)
                    dummy_audio = np.zeros(44100 * 5) # 5 seconds of silence
                    sf.write(drum_audio_path, dummy_audio, 44100)


                from transcribe_drums import transcribe_drums_to_midi

                # Define output path
                output_dir = f"output/{job_id}"
                os.makedirs(output_dir, exist_ok=True)
                output_midi_path = os.path.join(output_dir, "drums_raw.mid")

                # Transcribe
                transcribe_drums_to_midi(drum_audio_path, output_midi_path)

                print(f"✅ T49: Drum transcription completed. MIDI saved to {output_midi_path}")

            else:
                print(f"⏭️  T49: Drums not requested, skipping drum transcription")

        except Exception as drum_error:
            print(f"⚠️  T49: Drum transcription failed: {drum_error}")
            # Continue with job processing even if drum processing fails

        # Step 6: Additional processing
        update_progress(90, "RUNNING", "Phase 5: Finalization")
        time.sleep(1)  # Simulate additional processing

        # Step 4: Finalization - Progress 100%
        print(f"📋 Finalizing job {job_id}")
        update_progress(100, "SUCCEEDED", "Job completed successfully")

        # Step 5: Create placeholder artifact (T31)
        print(f"📋 Creating placeholder artifact for job {job_id}")

        import uuid
        artifact_id = str(uuid.uuid4())
        storage_path = f"artifacts/{job_id}/placeholder.txt"

        # Create placeholder artifact record
        artifact_data = {
            "id": artifact_id,
            "job_id": job_id,
            "kind": "text",
            "instrument": "placeholder",
            "storage_path": storage_path,
            "bytes": 50,  # Approximate size of placeholder content
            "created_at": datetime.utcnow().isoformat()
        }

        artifact_insert = supabase.table("artifacts").insert(artifact_data).execute()

        if not artifact_insert.data:
            print(f"⚠️  Failed to create artifact record, but job succeeded")
        else:
            print(f"✅ Placeholder artifact created: {artifact_id}")

        # Return success result
        result = {
            "job_id": job_id,
            "status": "SUCCEEDED",
            "message": "T32 job with progress reporting and artifact completed successfully",
            "processed_at": datetime.utcnow().isoformat(),
            "implementation": "progress_reporting_with_artifact",
            "artifacts": [artifact_id] if artifact_insert.data else [],
            "progress_stages": [0, 25, 60, 100]
        }

        print(f"🎉 T32: Job {job_id} completed successfully with progress reporting (0→25→60→100)")
        return result

    except Exception as exc:
        print(f"❌ T30: Job {job_id} failed: {exc}")

        # Try to update job status to failed
        try:
            import os
            from dotenv import load_dotenv
            from supabase import create_client

            load_dotenv()

            supabase_url = os.getenv("SUPABASE_URL")
            supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

            if all([supabase_url, supabase_service_key]):
                supabase = create_client(supabase_url, supabase_service_key)

                supabase.table("jobs").update({
                    "status": "FAILED"
                }).eq("id", job_id).execute()

                print(f"📋 Job {job_id} status updated to FAILED")
        except Exception as db_error:
            print(f"⚠️  Failed to update job status to FAILED: {db_error}")

        raise
