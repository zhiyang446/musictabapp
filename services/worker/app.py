"""
Celery application for Music Tab App Worker
"""
from celery import Celery
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Celery app
app = Celery("musictabapp-worker")

# Load configuration from celeryconfig.py
app.config_from_object("celeryconfig")

# Auto-discover tasks
app.autodiscover_tasks(["tasks"])

if __name__ == "__main__":
    app.start()
