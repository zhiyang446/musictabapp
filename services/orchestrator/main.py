"""
Music Transcription Orchestrator Service
FastAPI application for managing transcription jobs
"""

from fastapi import FastAPI, Depends, Request, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
from dotenv import load_dotenv
from db import db_client
from auth import jwt_bearer, jwt_bearer_optional, get_current_user_id

# Load environment variables
load_dotenv()

# Request/Response models
class UploadUrlRequest(BaseModel):
    fileName: str
    contentType: str

class UploadUrlResponse(BaseModel):
    url: str
    storagePath: str

class CreateJobRequest(BaseModel):
    source_type: str  # 'upload' | 'youtube'
    source_object_path: str = None  # Storage path for upload mode
    youtube_url: str = None  # URL for youtube mode
    instruments: list[str]  # ['drums','bass','guitar','piano','chords']
    options: dict = {}  # Additional options

class CreateJobResponse(BaseModel):
    jobId: str

class JobItem(BaseModel):
    id: str
    source_type: str
    source_object_path: Optional[str]
    youtube_url: Optional[str]
    instruments: List[str]
    options: dict
    status: str
    progress: int
    created_at: str
    updated_at: Optional[str]

class GetJobsResponse(BaseModel):
    jobs: List[JobItem]
    total: int
    has_more: bool
    next_cursor: Optional[str]

class JobDetailResponse(BaseModel):
    id: str
    user_id: str
    source_type: str
    source_object_path: Optional[str]
    youtube_url: Optional[str]
    instruments: List[str]
    options: dict
    status: str
    progress: int
    error_message: Optional[str]
    created_at: str
    updated_at: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]

class ArtifactItem(BaseModel):
    id: str
    job_id: str
    kind: str  # 'midi', 'musicxml', 'pdf', 'preview'
    instrument: Optional[str]
    storage_path: str
    bytes: Optional[int]
    created_at: str

class JobArtifactsResponse(BaseModel):
    job_id: str
    artifacts: List[ArtifactItem]
    total: int

# Create FastAPI app
app = FastAPI(
    title="Music Transcription Orchestrator",
    description="API for managing music transcription jobs and artifacts",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Music Transcription Orchestrator API",
        "version": "0.1.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"ok": True}

@app.get("/health/db")
async def database_health_check():
    """Database health check endpoint"""
    db_healthy = await db_client.health_check()
    return {"db": db_healthy}

@app.get("/protected")
async def protected_endpoint(request: Request, _: str = Depends(jwt_bearer)):
    """Protected endpoint requiring JWT authentication"""
    user_id = get_current_user_id(request)
    return {
        "message": "Access granted",
        "user_id": user_id,
        "authenticated": True
    }

@app.get("/auth/test")
async def auth_test_endpoint(request: Request, user_id: str = Depends(jwt_bearer_optional)):
    """Test endpoint for JWT middleware - optional auth"""
    if user_id:
        return {
            "authenticated": True,
            "user_id": user_id,
            "message": "Token valid"
        }
    else:
        return {
            "authenticated": False,
            "message": "No valid token provided"
        }

@app.post("/upload-url", response_model=UploadUrlResponse)
async def create_upload_url(
    request: UploadUrlRequest,
    current_request: Request,
    _: str = Depends(jwt_bearer)
) -> UploadUrlResponse:
    """Create signed upload URL for file upload"""
    user_id = get_current_user_id(current_request)

    # Generate unique storage path
    file_extension = ""
    if "." in request.fileName:
        file_extension = request.fileName.split(".")[-1]

    unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
    storage_path = f"audio-input/{user_id}/{unique_filename}"

    try:
        # Get Supabase client
        supabase = db_client.get_supabase_client()

        # Create signed upload URL (expires in 1 hour)
        response = supabase.storage.from_("audio-input").create_signed_upload_url(storage_path)

        # Supabase returns 'signedUrl' (lowercase 'u')
        signed_url = response.get("signedUrl") or response.get("signedURL")
        if not signed_url:
            raise HTTPException(status_code=500, detail="Failed to create upload URL")

        return UploadUrlResponse(
            url=signed_url,
            storagePath=storage_path
        )

    except Exception as e:
        print(f"Upload URL creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create upload URL")

@app.post("/jobs", response_model=CreateJobResponse)
async def create_job(
    request: CreateJobRequest,
    current_request: Request,
    _: str = Depends(jwt_bearer)
) -> CreateJobResponse:
    """Create a new transcription job"""
    user_id = get_current_user_id(current_request)

    # Validate request
    if request.source_type not in ['upload', 'youtube']:
        raise HTTPException(status_code=400, detail="source_type must be 'upload' or 'youtube'")

    if request.source_type == 'upload' and not request.source_object_path:
        raise HTTPException(status_code=400, detail="source_object_path required for upload mode")

    if request.source_type == 'youtube' and not request.youtube_url:
        raise HTTPException(status_code=400, detail="youtube_url required for youtube mode")

    if not request.instruments or len(request.instruments) == 0:
        raise HTTPException(status_code=400, detail="At least one instrument must be specified")

    try:
        # Get Supabase client
        supabase = db_client.get_supabase_client()

        # Create job record
        job_data = {
            "user_id": user_id,
            "source_type": request.source_type,
            "source_object_path": request.source_object_path,
            "youtube_url": request.youtube_url,
            "instruments": request.instruments,
            "options": request.options,
            "status": "PENDING",
            "progress": 0
        }

        # Insert job into database
        response = supabase.table("jobs").insert(job_data).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create job")

        job_id = response.data[0]["id"]

        return CreateJobResponse(jobId=job_id)

    except Exception as e:
        print(f"Job creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create job")

@app.get("/jobs", response_model=GetJobsResponse)
async def get_jobs(
    current_request: Request,
    status: Optional[str] = Query(None, description="Filter by job status"),
    cursor: Optional[str] = Query(None, description="Pagination cursor (job ID)"),
    limit: int = Query(10, ge=1, le=100, description="Number of jobs to return"),
    _: str = Depends(jwt_bearer)
) -> GetJobsResponse:
    """Get paginated list of jobs for the authenticated user"""
    user_id = get_current_user_id(current_request)

    try:
        # Get Supabase client
        supabase = db_client.get_supabase_client()

        # Build query
        query = supabase.table("jobs").select("*").eq("user_id", user_id)

        # Add status filter if provided
        if status:
            query = query.eq("status", status)

        # Add cursor-based pagination
        if cursor:
            # Use cursor as the starting point (jobs created before this cursor)
            query = query.lt("created_at", cursor)

        # Order by created_at descending (newest first) and limit
        query = query.order("created_at", desc=True).limit(limit + 1)  # +1 to check if there are more

        # Execute query
        response = query.execute()

        if not response.data:
            return GetJobsResponse(
                jobs=[],
                total=0,
                has_more=False,
                next_cursor=None
            )

        jobs_data = response.data
        has_more = len(jobs_data) > limit

        # Remove the extra item if we have more than limit
        if has_more:
            jobs_data = jobs_data[:-1]

        # Convert to JobItem models
        jobs = []
        for job in jobs_data:
            jobs.append(JobItem(
                id=job["id"],
                source_type=job["source_type"],
                source_object_path=job.get("source_object_path"),
                youtube_url=job.get("youtube_url"),
                instruments=job["instruments"],
                options=job.get("options", {}),
                status=job["status"],
                progress=job.get("progress", 0),
                created_at=job["created_at"],
                updated_at=job.get("updated_at")
            ))

        # Get total count for this user (with status filter if applied)
        count_query = supabase.table("jobs").select("id", count="exact").eq("user_id", user_id)
        if status:
            count_query = count_query.eq("status", status)

        count_response = count_query.execute()
        total = count_response.count if count_response.count is not None else len(jobs)

        # Set next cursor to the created_at of the last job
        next_cursor = None
        if has_more and jobs:
            next_cursor = jobs[-1].created_at

        return GetJobsResponse(
            jobs=jobs,
            total=total,
            has_more=has_more,
            next_cursor=next_cursor
        )

    except Exception as e:
        print(f"Get jobs error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve jobs")

@app.get("/jobs/{job_id}", response_model=JobDetailResponse)
async def get_job_detail(
    job_id: str,
    current_request: Request,
    _: str = Depends(jwt_bearer)
) -> JobDetailResponse:
    """Get detailed information about a specific job"""
    user_id = get_current_user_id(current_request)

    try:
        # Get Supabase client
        supabase = db_client.get_supabase_client()

        # Query for the specific job
        response = supabase.table("jobs").select("*").eq("id", job_id).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Job not found")

        job = response.data[0]

        # Check if the job belongs to the current user
        if job["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied: Job belongs to another user")

        # Return detailed job information
        return JobDetailResponse(
            id=job["id"],
            user_id=job["user_id"],
            source_type=job["source_type"],
            source_object_path=job.get("source_object_path"),
            youtube_url=job.get("youtube_url"),
            instruments=job["instruments"],
            options=job.get("options", {}),
            status=job["status"],
            progress=job.get("progress", 0),
            error_message=job.get("error_message"),
            created_at=job["created_at"],
            updated_at=job.get("updated_at"),
            started_at=job.get("started_at"),
            completed_at=job.get("completed_at")
        )

    except HTTPException:
        # Re-raise HTTP exceptions (404, 403)
        raise
    except Exception as e:
        print(f"Get job detail error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve job details")

@app.get("/jobs/{job_id}/artifacts", response_model=JobArtifactsResponse)
async def get_job_artifacts(
    job_id: str,
    current_request: Request,
    _: str = Depends(jwt_bearer)
) -> JobArtifactsResponse:
    """Get artifacts for a specific job"""
    user_id = get_current_user_id(current_request)

    try:
        # Get Supabase client
        supabase = db_client.get_supabase_client()

        # First, verify the job exists and belongs to the user
        job_response = supabase.table("jobs").select("id, user_id").eq("id", job_id).execute()

        if not job_response.data or len(job_response.data) == 0:
            raise HTTPException(status_code=404, detail="Job not found")

        job = job_response.data[0]

        # Check if the job belongs to the current user
        if job["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied: Job belongs to another user")

        # Query artifacts for this job
        artifacts_response = supabase.table("artifacts").select("*").eq("job_id", job_id).order("created_at", desc=True).execute()

        artifacts = []
        if artifacts_response.data:
            for artifact in artifacts_response.data:
                artifacts.append(ArtifactItem(
                    id=artifact["id"],
                    job_id=artifact["job_id"],
                    kind=artifact["kind"],
                    instrument=artifact.get("instrument"),
                    storage_path=artifact["storage_path"],
                    bytes=artifact.get("bytes"),
                    created_at=artifact["created_at"]
                ))

        return JobArtifactsResponse(
            job_id=job_id,
            artifacts=artifacts,
            total=len(artifacts)
        )

    except HTTPException:
        # Re-raise HTTP exceptions (404, 403)
        raise
    except Exception as e:
        print(f"Get job artifacts error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve job artifacts")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
