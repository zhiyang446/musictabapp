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
    Download YouTube video and extract audio (placeholder)
    """
    try:
        self.update_state(
            state="PROGRESS",
            meta={"current": 10, "total": 100, "status": "Starting YouTube download..."}
        )
        
        # Simulate YouTube download steps
        steps = [
            ("Fetching video metadata", 20),
            ("Downloading video", 50),
            ("Extracting audio", 80),
            ("Uploading to storage", 100)
        ]
        
        for step_name, progress in steps:
            time.sleep(1)
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": progress,
                    "total": 100,
                    "status": step_name,
                    "job_id": job_id,
                    "youtube_url": youtube_url
                }
            )
        
        result = {
            "job_id": job_id,
            "youtube_url": youtube_url,
            "status": "completed",
            "audio_path": f"audio-input/{job_id}/extracted_audio.wav",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return result
        
    except Exception as exc:
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
    Main job processing task - T30 empty implementation
    Reads job_id and updates status RUNNING → SUCCEEDED
    """
    try:
        print(f"🔄 T30: Processing job {job_id}")

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

        # Step 1: Update job status to RUNNING
        print(f"📋 Updating job {job_id} status to RUNNING")

        running_update = supabase.table("jobs").update({
            "status": "RUNNING",
            "progress": 0
        }).eq("id", job_id).execute()

        if not running_update.data:
            raise Exception(f"Failed to update job {job_id} to RUNNING status")

        print(f"✅ Job {job_id} status updated to RUNNING")

        # Step 2: Simulate minimal processing (T30 empty implementation)
        print(f"📋 Processing job {job_id} (empty implementation)")

        # Minimal delay to simulate processing
        time.sleep(2)

        # Step 3: Update job status to SUCCEEDED
        print(f"📋 Updating job {job_id} status to SUCCEEDED")

        succeeded_update = supabase.table("jobs").update({
            "status": "SUCCEEDED",
            "progress": 100
        }).eq("id", job_id).execute()

        if not succeeded_update.data:
            raise Exception(f"Failed to update job {job_id} to SUCCEEDED status")

        print(f"✅ Job {job_id} status updated to SUCCEEDED")

        # Step 4: Create placeholder artifact (T31)
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
            "message": "T31 empty implementation with placeholder artifact completed successfully",
            "processed_at": datetime.utcnow().isoformat(),
            "implementation": "empty_with_artifact",
            "artifacts": [artifact_id] if artifact_insert.data else []
        }

        print(f"🎉 T31: Job {job_id} completed successfully (RUNNING → SUCCEEDED) with artifact")
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
