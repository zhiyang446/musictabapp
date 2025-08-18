"""
Celery configuration for Music Tab App Worker
"""
import os
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

# Celery configuration
broker_url = REDIS_URL
result_backend = REDIS_URL

# Task settings
task_serializer = "json"
accept_content = ["json"]
result_serializer = "json"
timezone = "UTC"
enable_utc = True

# Task routing
task_routes = {
    "tasks.process_audio": {"queue": "audio_processing"},
    "tasks.download_youtube": {"queue": "youtube_download"},
    "tasks.generate_tabs": {"queue": "tab_generation"},
    "tasks.test_task": {"queue": "default"},
    "tasks.process_job": {"queue": "default"},
}

# Worker settings
worker_prefetch_multiplier = 1
task_acks_late = True
worker_max_tasks_per_child = 1000

# Task time limits (in seconds)
task_soft_time_limit = 300  # 5 minutes
task_time_limit = 600       # 10 minutes

# Result settings
result_expires = 3600  # 1 hour

# Monitoring
worker_send_task_events = True
task_send_sent_event = True

# Error handling
task_reject_on_worker_lost = True
task_ignore_result = False

# Queue definitions
task_default_queue = "default"
task_default_exchange = "default"
task_default_exchange_type = "direct"
task_default_routing_key = "default"

# Beat schedule (for periodic tasks)
beat_schedule = {
    # Add periodic tasks here if needed
    # 'cleanup-expired-jobs': {
    #     'task': 'worker.tasks.cleanup_expired_jobs',
    #     'schedule': 3600.0,  # Run every hour
    # },
}

# Logging
worker_log_format = "[%(asctime)s: %(levelname)s/%(processName)s] %(message)s"
worker_task_log_format = "[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s"

# Security
worker_hijack_root_logger = False
worker_log_color = True
