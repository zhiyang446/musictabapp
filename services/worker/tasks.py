"""
Celery tasks for Music Tab App Worker - FIXED
- Download source before T48 to define local_audio_path
- Robust error_message updates
- Stable stems upload (audio-stems bucket, relative storage_path)
"""

from app import app
import time
import os
from datetime import datetime, timezone
import numpy as np  # ✅

# ===== 不要在顶层 import supabase 模块，避免与变量名冲突 =====
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

# Import audio processing modules at the top level
try:
    from source_separator import process_with_separation
    print("✅ Successfully imported source_separator")
except ImportError as e:
    print(f"⚠️ Failed to import source_separator: {e}")
    process_with_separation = None


@app.task(bind=True)
def test_task(self, message="Hello from Celery!"):
    """
    Test task to verify Celery is working
    """
    try:
        time.sleep(2)
        self.update_state(
            state="PROGRESS",
            meta={"current": 50, "total": 100, "status": "Processing test task..."}
        )
        time.sleep(2)
        result = {
            "message": message,
            "task_id": self.request.id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "worker_id": os.getpid(),
            "status": "completed"
        }
        return result
    except Exception as exc:
        self.update_state(state="FAILURE", meta={"error": str(exc), "task_id": self.request.id})
        raise


@app.task(bind=True)
def process_audio(self, job_id, source_path, instruments, options=None):
    """
    Placeholder audio processing
    """
    try:
        self.update_state(state="PROGRESS", meta={"current": 10, "total": 100, "status": "Starting audio processing..."})
        steps = [
            ("Downloading source audio", 20),
            ("Analyzing audio structure", 40),
            ("Separating instruments", 60),
            ("Generating MIDI", 80),
            ("Creating tabs", 90),
            ("Uploading artifacts", 100)
        ]
        for step_name, progress in steps:
            time.sleep(1)
            self.update_state(
                state="PROGRESS",
                meta={"current": progress, "total": 100, "status": step_name, "job_id": job_id}
            )
        result = {
            "job_id": job_id,
            "status": "completed",
            "artifacts": [{"type": "midi", "instrument": inst, "path": f"artifacts/{job_id}/{inst}.mid"} for inst in instruments],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        return result
    except Exception as exc:
        self.update_state(state="FAILURE", meta={"error": str(exc), "job_id": job_id})
        raise


@app.task(bind=True)
def download_youtube(self, job_id, youtube_url, options=None):
    """
    T45 - Download YouTube audio with yt-dlp
    """
    try:
        from youtube_downloader import create_youtube_downloader
        import logging
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__name__)
        logger.info(f"🎬 T45: Starting YouTube download task for job {job_id}")

        self.update_state(state="PROGRESS", meta={"current": 10, "total": 100, "status": "Initializing YouTube downloader..."})
        downloader = create_youtube_downloader()
        self.update_state(state="PROGRESS", meta={"current": 20, "total": 100, "status": "Starting YouTube audio download..."})
        target_format = options.get('audio_format', 'm4a') if options else 'm4a'
        self.update_state(state="PROGRESS", meta={"current": 30, "total": 100, "status": "Downloading audio from YouTube..."})

        result = downloader.process_youtube_audio(youtube_url=youtube_url, job_id=job_id, target_format=target_format)

        self.update_state(state="PROGRESS", meta={"current": 100, "total": 100, "status": "YouTube audio processing completed"})

        final_result = {
            "job_id": job_id,
            "youtube_url": youtube_url,
            "status": "completed",
            "storage_path": result['storage_path'],
            "video_title": result['video_title'],
            "duration": result['duration'],
            "file_size": result['file_size'],
            "format": result['format'],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        logger.info(f"🎉 T45: YouTube download task completed for job {job_id}")
        return final_result
    except Exception as exc:
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"❌ T45 failed for job {job_id}: {str(exc)}")
        except Exception:
            pass
        self.update_state(state="FAILURE", meta={"error": str(exc), "job_id": job_id, "youtube_url": youtube_url})
        raise


@app.task(bind=True)
def generate_tabs(self, job_id, audio_path, instruments, options=None):
    """
    Placeholder tab generation
    """
    try:
        self.update_state(state="PROGRESS", meta={"current": 10, "total": 100, "status": "Starting tab generation..."})
        for i, instrument in enumerate(instruments):
            progress = int((i + 1) / max(1, len(instruments)) * 90)
            self.update_state(
                state="PROGRESS",
                meta={"current": progress, "total": 100, "status": f"Generating {instrument} tabs...", "job_id": job_id}
            )
            time.sleep(2)
        self.update_state(state="PROGRESS", meta={"current": 100, "total": 100, "status": "Finalizing tabs..."})
        result = {
            "job_id": job_id,
            "status": "completed",
            "tabs": [{
                "instrument": inst,
                "formats": ["pdf", "musicxml"],
                "paths": {"pdf": f"artifacts/{job_id}/{inst}.pdf", "musicxml": f"artifacts/{job_id}/{inst}.musicxml"}
            } for inst in instruments],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        return result
    except Exception as exc:
        self.update_state(state="FAILURE", meta={"error": str(exc), "job_id": job_id})
        raise


@app.task
def process_job(job_id, job_data=None):
    """
    Main job processing task - T32/T45/T48 with progress reporting
    Progress milestones: 0 → 25 → 60 → (75..90 demucs) → 100
    """
    try:
        print(f"🔄 T32/T45/T48: Processing job {job_id}")

        # ---- Supabase admin client (service role) ----
        from dotenv import load_dotenv
        load_dotenv()
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not all([supabase_url, supabase_service_key]):
            raise Exception("Missing Supabase configuration (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)")
        supabase = create_client(supabase_url, supabase_service_key)
        # supabase = create_client(supabase_url, supabase_service_key)  # 你已有

        def safe_update(fields: dict):
            try:
                supabase.table("jobs").update(fields).eq("id", job_id).execute()
                print("🔧 DB update ->", fields)
                return True
            except Exception as e:
                print("❌ DB update failed:", repr(e))
            return False


        def set_failed(msg: str, progress: int | None = None):
            """统一落库失败：status、error_message、可选进度。"""
            payload = {"status": "FAILED", "error_message": msg}
            if progress is not None:
                payload["progress"] = progress
            supabase.table("jobs").update(payload).eq("id", job_id).execute()


        # ---- Load job row if not provided ----
        if not job_data:
            job_result = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
            if not job_result.data:
                raise Exception(f"Job {job_id} not found")
            job_data = job_result.data

        def update_progress(pct, status="RUNNING", message=""):
            print(f"📊 Job {job_id} → {pct}% - {message}")
            safe_update({"status": status, "progress": pct})


        # ---- Init ----
        update_progress(0, "RUNNING", "Initializing job")
        source_type = job_data.get('source_type', 'upload')
        print(f"📋 source_type={source_type}")

        # ---- Phase 1: Source prepare ----
        update_progress(25, "RUNNING", "Phase 1: Source processing")

        if source_type == 'youtube':
            from youtube_downloader import create_youtube_downloader
            downloader = create_youtube_downloader()
            update_progress(30, "RUNNING", "Downloading audio from YouTube")
            opts = job_data.get('options', {}) if isinstance(job_data, dict) else {}
            target_format = opts.get('audio_format', 'm4a')
            y = downloader.process_youtube_audio(youtube_url=job_data.get('youtube_url'), job_id=job_id, target_format=target_format)
            supabase.table("jobs").update({"source_object_path": y['storage_path']}).eq("id", job_id).execute()
        elif source_type == 'upload':
            print("📁 Upload job: assume source already in storage")
            time.sleep(1)
        else:
            raise Exception(f"Unsupported source type: {source_type}")

        # ---- Phase 2: Preprocess ----
        update_progress(60, "RUNNING", "Phase 2: Audio preprocessing")
        try:
            source_path = job_data.get('source_object_path')
            if source_path:
                print(f"🔄 T47: preprocessing {source_path} (simulated)")
                time.sleep(1)
                update_progress(75, "RUNNING", "Audio preprocessing completed")
            else:
                print("⚠️ No source_object_path; skip preprocessing")
        except Exception as e:
            print(f"⚠️ T47 failed: {e}")

        # ======== Download source before T48 to define local_audio_path ========
        import tempfile
        local_dir = tempfile.mkdtemp()
        local_audio_path = os.path.join(local_dir, f"input_audio_{job_id}.mp3")
        try:
            source_path = job_data.get('source_object_path') or supabase.table("jobs").select("source_object_path").eq("id", job_id).single().execute().data.get("source_object_path")
            if not source_path:
                raise RuntimeError("source_object_path is empty")
            # Use admin client to download bytes directly
            binary = supabase.storage.from_("audio-input").download(source_path)
            with open(local_audio_path, "wb") as f:
                f.write(binary)
            print(f"✅ T48: downloaded source to {local_audio_path}")
        except Exception as e:
            print(f"⚠️  T48: download failed, create dummy: {e!r}")
            with open(local_audio_path, "wb") as f:
                f.write(b"dummy")

        # ---- Phase 3: Separation (Demucs) ----
        update_progress(75, "RUNNING", "Phase 3: Source separation")
        from traceback import format_exc

        try:
            job_options = job_data.get('options', {}) if isinstance(job_data, dict) else {}
            separate_sources = bool(job_options.get('separate', False))
            separation_method = 'demucs' if separate_sources else 'none'
            print(f"🎵 T48: separation -> {separation_method}")

            if separate_sources:
                if process_with_separation is None:
                    raise ImportError("source_separator module not available")

                # Map Demucs progress → 75..90
                def separation_progress_callback(progress, message):
                    real_progress = min(90, 75 + int(progress * 15 / 100))
                    safe_update({"progress": real_progress, "status": "RUNNING"})
                    print(f"🎵 T48 Progress {real_progress}% - {message}")

                separation_result = process_with_separation(
                    input_path=local_audio_path,
                    job_id=job_id,
                    separate=True,
                    sources=['vocals', 'drums', 'bass', 'other'],
                    method=separation_method,
                    progress_callback=separation_progress_callback
                )

                if not separation_result.get("success", False):
                    raise RuntimeError(f"Separation failed: {separation_result.get('error')}")

                if separation_result.get("separation_enabled", False):
                    sep_info = separation_result.get("separation_result", {}) or {}
                    files_dict = sep_info.get("separated_files") or sep_info.get("stems") or {}
                    print(f"🧩 stems to upload -> {list(files_dict.keys())}")

                    uploaded_count = 0
                    upload_errors = []
                    bucket = "audio-stems"

                    for idx, (stem_type, file_path) in enumerate(files_dict.items(), start=1):
                        try:
                            if not os.path.exists(file_path):
                                raise FileNotFoundError(f"stem file not found: {file_path}")

                            storage_path = f"{job_id}/{stem_type}.wav"  # relative path only
                            print(f"⬆️  upload {stem_type} -> {bucket}/{storage_path}")

                            with open(file_path, "rb") as fp:
                                supabase.storage.from_(bucket).upload(
                                    path=storage_path,
                                    file=fp,
                                    file_options={"contentType": "audio/wav", "upsert": True}
                                )

                            import uuid
                            artifact_id = str(uuid.uuid4())
                            artifact_row = {
                                "id": artifact_id,
                                "job_id": job_id,
                                "kind": "audio",
                                "instrument": stem_type,
                                "storage_path": storage_path,
                                "bytes": os.path.getsize(file_path),
                                "created_at": datetime.now(timezone.utc).isoformat()
                            }
                            ins = supabase.table("artifacts").insert(artifact_row).execute()
                            if not ins.data:
                                raise RuntimeError(f"insert artifact failed for {stem_type}: {ins}")

                            uploaded_count += 1
                            newp = min(90, 75 + 1 + idx)
                            supabase.table("jobs").update({"progress": newp, "status": "RUNNING"}).eq("id", job_id).execute()
                            print(f"✅ uploaded {stem_type} & created artifact")

                        except Exception as e:
                            from traceback import format_exc as _fx
                            upload_errors.append(f"{stem_type}: {repr(e)}\n{_fx()}")
                            print(f"❌ upload {stem_type} failed: {repr(e)}")

                    if uploaded_count == 0:
                        msg = "No stems uploaded.\n" + "\n---\n".join(upload_errors)
                        set_failed(msg, progress=75)
                        return

                print(f"✅ stems uploaded = {uploaded_count}")
                update_progress(90, "RUNNING", "Stems uploaded")
            else:
                print(f"⏭️ separation disabled at runtime: {separation_result.get('note')}")

        except Exception as e:
            msg = f"T48 fatal error: {repr(e)}\n{format_exc()}"
            print("❌", msg)
            set_failed(msg, progress=75)   # 失败时把 error_message 一起写到 DB
            return

        # ---- Phase 4: Drum transcription (placeholder) ----
        update_progress(85, "RUNNING", "Phase 4: Drum transcription to MIDI")
        try:
            instruments = job_data.get('instruments', []) or []
            if 'drums' in instruments:
                print("🥁 T49: drum transcription placeholder")
                drum_audio_path = f"output/{job_id}/drums.wav"
                if not os.path.exists(drum_audio_path):
                    print("⚠️  T49: Drum audio file not found ... Creating a dummy file for testing.")
                    import soundfile as sf
                    os.makedirs(os.path.dirname(drum_audio_path), exist_ok=True)
                    dummy_audio = np.zeros(44100 * 5)
                    sf.write(drum_audio_path, dummy_audio, 44100)
                    # from transcribe_drums import transcribe_drums_to_midi
                    # transcribe_drums_to_midi(drum_audio_path, f"output/{job_id}/drums_raw.mid")
                else:
                    print("⏭️ Drums not requested")
        except Exception as drum_error:
            print(f"⚠️  T49 failed: {drum_error}")

        # ---- Phase 5: Finalization ----
        update_progress(90, "RUNNING", "Phase 5: Finalization")
        time.sleep(1)

        print("📋 Finalizing")
        update_progress(100, "SUCCEEDED", "Job completed successfully")

        # Optional placeholder artifact
        import uuid
        artifact_id = str(uuid.uuid4())
        storage_path = f"artifacts/{job_id}/placeholder.txt"
        artifact_data = {
            "id": artifact_id,
            "job_id": job_id,
            "kind": "text",
            "instrument": "placeholder",
            "storage_path": storage_path,
            "bytes": 50,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("artifacts").insert(artifact_data).execute()

        result = {
            "job_id": job_id,
            "status": "SUCCEEDED",
            "message": "Job completed successfully",
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "implementation": "progress_reporting_with_artifact",
            "artifacts": [artifact_id],
            "progress_stages": [0, 25, 60, 100]
        }
        print(f"🎉 Job {job_id} done")
        return result

    except Exception as exc:
        from traceback import format_exc
        msg = f"Job crashed: {repr(exc)}\n{format_exc()}"
        print("❌", msg)
        try:
            set_failed(msg)   # 统一写 error_message
        except Exception as db_error:
            print("⚠️ failed to mark FAILED:", repr(db_error))
        raise
