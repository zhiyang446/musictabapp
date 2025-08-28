#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
from celery import Celery

# Usage: python scripts/trigger-process-job.py <job_id>

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/trigger-process-job.py <job_id>")
        sys.exit(1)

    job_id = sys.argv[1]

    load_dotenv()
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = os.getenv("REDIS_PORT", "6379")
    redis_db = os.getenv("REDIS_DB", "0")
    redis_password = os.getenv("REDIS_PASSWORD")

    if redis_password:
        redis_url = f"redis://:{redis_password}@{redis_host}:{redis_port}/{redis_db}"
    else:
        redis_url = f"redis://{redis_host}:{redis_port}/{redis_db}"

    app = Celery("trigger", broker=redis_url, backend=redis_url)

    # Send task to default queue
    result = app.send_task("tasks.process_job", args=[job_id, None], queue="default")
    print(f"✅ Sent tasks.process_job for job {job_id}. Task ID: {result.id}")

if __name__ == "__main__":
    main()

