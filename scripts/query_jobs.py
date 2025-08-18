#!/usr/bin/env python3
"""
Job Status Query Script (Python)

Query and display job statuses from the database
Usage: python scripts/query_jobs.py [job_id] [--limit=10] [--status=PENDING]
"""

import os
import sys
import argparse
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def get_status_icon(status):
    icons = {
        'PENDING': '⏳',
        'QUEUED': '📋',
        'RUNNING': '🔄',
        'SUCCEEDED': '✅',
        'COMPLETED': '✅',
        'FAILED': '❌',
        'CANCELLED': '🚫'
    }
    return icons.get(status, '❓')

def get_progress_bar(progress, width=20):
    if progress is None:
        progress = 0
    filled = int((progress / 100) * width)
    empty = width - filled
    return '█' * filled + '░' * empty

def format_datetime(dt_str):
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except:
        return dt_str

def query_jobs(job_id=None, limit=10, status_filter=None):
    print('📋 Job Status Query (Python)')
    print('=============================')
    
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not all([supabase_url, supabase_service_key]):
            print("❌ Missing Supabase configuration")
            return
        
        supabase = create_client(supabase_url, supabase_service_key)
        
        if job_id:
            # Query specific job
            print(f"🔍 Querying specific job: {job_id}")
            response = supabase.table("jobs").select("*").eq("id", job_id).execute()
        else:
            # Query multiple jobs
            print(f"🔍 Querying recent jobs (limit: {limit})")
            query = supabase.table("jobs").select("*")
            
            if status_filter:
                print(f"   Status filter: {status_filter}")
                query = query.eq("status", status_filter)
            
            response = query.order("created_at", desc=True).limit(limit).execute()
        
        jobs = response.data
        
        if not jobs:
            print("📭 No jobs found")
            return
        
        print(f"\n📊 Found {len(jobs)} job(s):")
        print('=' * 80)
        
        for i, job in enumerate(jobs, 1):
            status_icon = get_status_icon(job['status'])
            progress_bar = get_progress_bar(job.get('progress', 0))
            
            print(f"\n{i}. Job {job['id']}")
            print(f"   Status: {status_icon} {job['status']}")
            print(f"   Progress: {progress_bar} {job.get('progress', 0)}%")
            print(f"   User: {job['user_id']}")
            print(f"   Created: {format_datetime(job['created_at'])}")
            print(f"   Updated: {format_datetime(job['updated_at'])}")
            
            if job.get('youtube_url'):
                print(f"   YouTube: {job['youtube_url']}")
            
            if job.get('error'):
                print(f"   Error: {job['error']}")
        
        # Summary statistics
        print('\n📈 Status Summary:')
        status_counts = {}
        for job in jobs:
            status = job['status']
            status_counts[status] = status_counts.get(status, 0) + 1
        
        for status, count in status_counts.items():
            icon = get_status_icon(status)
            print(f"   {icon} {status}: {count}")
        
    except Exception as e:
        print(f"❌ Query failed: {e}")
        import traceback
        traceback.print_exc()

def main():
    parser = argparse.ArgumentParser(description='Query job statuses from database')
    parser.add_argument('job_id', nargs='?', help='Specific job ID to query')
    parser.add_argument('--limit', type=int, default=10, help='Limit number of results (default: 10)')
    parser.add_argument('--status', help='Filter by status (PENDING, RUNNING, SUCCEEDED, etc.)')
    
    args = parser.parse_args()
    
    query_jobs(args.job_id, args.limit, args.status)

if __name__ == "__main__":
    main()
