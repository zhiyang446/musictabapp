"""
Music Transcription Orchestrator Service
FastAPI application for managing transcription jobs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from db import db_client

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
