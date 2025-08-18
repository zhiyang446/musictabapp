"""
Celery client for orchestrator to send tasks to worker
"""
import os
from celery import Celery
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Redis configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

# Build Redis URL
if REDIS_PASSWORD:
    REDIS_URL = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
else:
    REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"

# Create Celery client (producer only)
celery_client = Celery("orchestrator-client")

# Configure client
celery_client.conf.update(
    broker_url=REDIS_URL,
    result_backend=REDIS_URL,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "tasks.process_audio": {"queue": "audio_processing"},
        "tasks.download_youtube": {"queue": "youtube_download"},
        "tasks.generate_tabs": {"queue": "tab_generation"},
        "tasks.test_task": {"queue": "default"},
        "tasks.process_job": {"queue": "default"},
    },
    # Don't start worker, just send tasks
    worker_hijack_root_logger=False,
    task_always_eager=False,  # Don't execute tasks immediately
)

def send_process_job_task(job_id: str, job_data: dict = None):
    """
    Send process_job task to worker queue

    Args:
        job_id: The job ID to process
        job_data: Optional job data for processing

    Returns:
        AsyncResult: Celery task result object or None if failed
    """
    try:
        # Send task to worker with timeout
        result = celery_client.send_task(
            "tasks.process_job",
            args=[job_id],
            kwargs={"job_data": job_data} if job_data else {},
            queue="default",
            # Don't wait for result, just send
            ignore_result=True
        )

        print(f"SUCCESS: Task sent to queue: {result.id} for job {job_id}")
        return result

    except Exception as e:
        print(f"WARNING: Failed to send task for job {job_id}: {e}")
        # Don't raise, just return None to allow graceful fallback
        return None

def send_test_task(message: str = "Hello from orchestrator!"):
    """
    Send test task to worker queue
    
    Args:
        message: Test message to send
    
    Returns:
        AsyncResult: Celery task result object
    """
    try:
        result = celery_client.send_task(
            "tasks.test_task",
            args=[message],
            queue="default"
        )
        
        print(f"✅ Test task sent to queue: {result.id}")
        return result
        
    except Exception as e:
        print(f"❌ Failed to send test task: {e}")
        raise

def get_task_status(task_id: str):
    """
    Get status of a task
    
    Args:
        task_id: The task ID to check
    
    Returns:
        dict: Task status information
    """
    try:
        result = celery_client.AsyncResult(task_id)
        
        return {
            "task_id": task_id,
            "status": result.status,
            "result": result.result if result.ready() else None,
            "traceback": result.traceback if result.failed() else None
        }
        
    except Exception as e:
        print(f"❌ Failed to get task status for {task_id}: {e}")
        return {
            "task_id": task_id,
            "status": "UNKNOWN",
            "error": str(e)
        }
