"""
Music Transcription Orchestrator Service
FastAPI application for managing transcription jobs
"""

from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
