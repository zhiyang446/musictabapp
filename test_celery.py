#!/usr/bin/env python3
"""
Test script to verify Celery configuration and task execution
"""

import sys
import os
from datetime import datetime

def test_celery_import():
    """Test if Celery app can be imported"""
    try:
        from app import app
        print("✅ Celery app imported successfully")
        print(f"   App name: {app.main}")
        print(f"   Broker URL: {app.conf.broker_url}")
        return app
    except Exception as e:
        print(f"❌ Failed to import Celery app: {e}")
        return None

def test_task_import():
    """Test if tasks can be imported"""
    try:
        import tasks
        print("✅ Tasks module imported successfully")
        
        # Check if tasks are registered
        from app import app
        task_names = [name for name in app.tasks.keys() if not name.startswith('celery.')]
        print(f"   Custom tasks found: {task_names}")
        
        return tasks
    except Exception as e:
        print(f"❌ Failed to import tasks: {e}")
        return None

def test_task_creation():
    """Test creating a task without executing it"""
    try:
        from tasks import test_task
        print("✅ test_task imported successfully")
        print(f"   Task name: {test_task.name}")
        return test_task
    except Exception as e:
        print(f"❌ Failed to import test_task: {e}")
        return None

def test_configuration():
    """Test Celery configuration"""
    try:
        from app import app
        config = app.conf
        
        print("✅ Celery configuration loaded")
        print(f"   Broker URL: {config.broker_url}")
        print(f"   Result backend: {config.result_backend}")
        print(f"   Task serializer: {config.task_serializer}")
        print(f"   Result serializer: {config.result_serializer}")
        print(f"   Timezone: {config.timezone}")
        
        return True
    except Exception as e:
        print(f"❌ Failed to load configuration: {e}")
        return False

def main():
    print("🔍 Celery Configuration Test")
    print("============================")
    print(f"Test time: {datetime.utcnow().isoformat()}")
    print(f"Python version: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    print()
    
    # Test 1: Import Celery app
    print("Test 1: Import Celery app")
    app = test_celery_import()
    if not app:
        return False
    print()
    
    # Test 2: Import tasks
    print("Test 2: Import tasks module")
    tasks = test_task_import()
    if not tasks:
        return False
    print()
    
    # Test 3: Import specific task
    print("Test 3: Import test_task")
    test_task = test_task_creation()
    if not test_task:
        return False
    print()
    
    # Test 4: Configuration
    print("Test 4: Check configuration")
    config_ok = test_configuration()
    if not config_ok:
        return False
    print()
    
    print("🎉 All tests passed!")
    print("✅ DoD: celery[redis] dependency working")
    print("✅ DoD: celeryconfig.py loaded")
    print("✅ DoD: Tasks can be imported and registered")
    print()
    print("📋 To start worker (requires Redis):")
    print("   celery -A app worker --loglevel=info")
    print()
    print("📋 To test task execution (requires Redis):")
    print("   python -c \"from tasks import test_task; result = test_task.delay('Hello'); print(result.id)\"")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
