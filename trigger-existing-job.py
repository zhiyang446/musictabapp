#!/usr/bin/env python3
"""
Script to manually trigger the existing job
"""
import sys
import os
sys.path.append('services/worker')

from celery import Celery
from tasks import process_job

# Create Celery app
app = Celery("musictabapp-worker")
app.config_from_object("services.worker.celeryconfig")

def trigger_job():
    """Manually trigger the existing job"""
    job_id = "658a0088-b5b8-4b8b-8b8b-8b8b8b8b8b8b"  # Your job ID from the screenshot
    
    print(f"🔧 Manually triggering job: {job_id}")
    
    try:
        # Send the task to the worker
        result = process_job.delay(job_id)
        print(f"✅ Task sent to worker: {result.id}")
        print("📊 Check your mobile app - the job should start processing now!")
        
    except Exception as e:
        print(f"❌ Error triggering job: {e}")

if __name__ == "__main__":
    trigger_job()
