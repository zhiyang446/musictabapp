#!/usr/bin/env python3
"""
Test script to verify Worker service is working after the fix
"""
import requests
import json
import time

def test_worker_connection():
    """Test if worker can process tasks"""
    print("🔧 Testing Worker Service Fix...")
    
    # Test orchestrator health
    try:
        response = requests.get("http://localhost:8080/health")
        if response.status_code == 200:
            print("✅ Orchestrator is healthy")
        else:
            print(f"❌ Orchestrator health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to orchestrator: {e}")
        return False
    
    # Test creating a simple job
    try:
        job_data = {
            "instrument": "drums",
            "options": {
                "separate": True,
                "precision": "balanced"
            }
        }
        
        response = requests.post(
            "http://localhost:8080/jobs",
            json=job_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 201:
            job = response.json()
            job_id = job["id"]
            print(f"✅ Job created successfully: {job_id}")
            
            # Check job status
            time.sleep(2)
            status_response = requests.get(f"http://localhost:8080/jobs/{job_id}")
            if status_response.status_code == 200:
                job_status = status_response.json()
                print(f"📊 Job status: {job_status['status']}")
                print(f"📊 Job progress: {job_status['progress']}%")
                
                if job_status['status'] != 'pending':
                    print("✅ Worker is processing tasks!")
                    return True
                else:
                    print("⚠️ Job is still pending - worker might not be picking up tasks")
                    return False
            else:
                print(f"❌ Cannot check job status: {status_response.status_code}")
                return False
        else:
            print(f"❌ Cannot create job: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing worker: {e}")
        return False

if __name__ == "__main__":
    success = test_worker_connection()
    if success:
        print("\n🎉 Worker service is working correctly!")
    else:
        print("\n❌ Worker service needs attention")
