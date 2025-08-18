"""
Music Transcription Orchestrator Service
FastAPI application for managing transcription jobs
"""

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from db import db_client
from auth import jwt_bearer, jwt_bearer_optional, get_current_user_id

# Load environment variables
load_dotenv()

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
