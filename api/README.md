# Music Tab App API

Basic REST API endpoints for the Music Tab application.

## Getting Started

### Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- Local Supabase instance running on port 54321
- All database migrations applied

### Installation
```bash
npm install
```

### Starting the Server
```bash
# Start the API server
npm run api:start

# Start with auto-reload (requires nodemon)
npm run api:dev
```

The server will start on port 3001 by default.

## API Endpoints

### Health Check
**GET** `/health`

Returns server health status and configuration.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-15T05:38:22.357Z",
  "service": "music-tab-api",
  "version": "1.0.0",
  "environment": "development",
  "supabase": {
    "url": "http://127.0.0.1:54321",
    "connected": true
  }
}
```

### Users API

#### Get All Users
**GET** `/api/users`

Returns a list of all users.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "display_name": "John Doe",
      "subscription_tier": "free",
      "created_at": "2025-08-15T05:30:00.000Z",
      "updated_at": "2025-08-15T05:30:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2025-08-15T05:38:22.357Z"
}
```

#### Create User
**POST** `/api/users`

Creates a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "display_name": "John Doe",
  "subscription_tier": "free"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "display_name": "John Doe",
    "subscription_tier": "free",
    "created_at": "2025-08-15T05:30:00.000Z",
    "updated_at": "2025-08-15T05:30:00.000Z"
  },
  "timestamp": "2025-08-15T05:38:22.357Z"
}
```

### File Upload API

#### Upload Audio File
**POST** `/api/upload`

Uploads an audio file and creates a database record.

**Content-Type**: `multipart/form-data`

**Form Fields:**
- `audio` (file): Audio file to upload (required)
- `user_id` (string): UUID of the user uploading the file (required)

**Supported Audio Formats:**
- MP3 (audio/mpeg, audio/mp3)
- WAV (audio/wav, audio/wave, audio/x-wav)
- AAC (audio/aac)
- OGG (audio/ogg)
- FLAC (audio/flac)
- M4A (audio/m4a)
- MP4 Audio (audio/mp4)

**File Size Limit**: 50MB

**Response (201):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "d37b1872-e5fa-4cd8-9a41-fe956c82ebd7",
    "filename": "1755237773891_test-audio.wav",
    "original_filename": "test-audio.wav",
    "file_size": 88244,
    "mime_type": "audio/wave",
    "upload_status": "completed",
    "created_at": "2025-08-15T06:02:53.901665+00:00"
  },
  "file_info": {
    "size_mb": "0.08",
    "type": "audio/wave"
  },
  "timestamp": "2025-08-15T06:02:53.905Z"
}
```

**Error Responses:**

**400 - No File:**
```json
{
  "error": "No file uploaded",
  "message": "Please select an audio file to upload",
  "timestamp": "2025-08-15T06:02:53.905Z"
}
```

**400 - Missing user_id:**
```json
{
  "error": "Validation error",
  "message": "user_id is required",
  "timestamp": "2025-08-15T06:02:53.905Z"
}
```

**400 - Invalid file type:**
```json
{
  "error": "Upload failed",
  "message": "Invalid file type. Only audio files are allowed. Received: image/jpeg",
  "timestamp": "2025-08-15T06:02:53.905Z"
}
```

### Audio Files API

#### Get All Audio Files
**GET** `/api/audio-files`

Returns a list of all audio files with user information.

**Query Parameters:**
- `user_id` (optional): Filter by user ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "987fcdeb-51a2-43d1-b456-426614174001",
      "filename": "audio-file.mp3",
      "original_filename": "My Song.mp3",
      "file_size": 2048000,
      "upload_status": "completed",
      "processing_status": "pending",
      "duration_seconds": 180.5,
      "created_at": "2025-08-15T05:30:00.000Z",
      "updated_at": "2025-08-15T05:30:00.000Z",
      "users": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "user@example.com",
        "display_name": "John Doe"
      }
    }
  ],
  "count": 1,
  "timestamp": "2025-08-15T05:38:22.357Z"
}
```

#### Create Audio File Record
**POST** `/api/audio-files`

Creates a new audio file record.

**Request Body:**
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "audio-file.mp3",
  "original_filename": "My Song.mp3",
  "file_size": 2048000,
  "mime_type": "audio/mpeg"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "987fcdeb-51a2-43d1-b456-426614174001",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "filename": "audio-file.mp3",
    "original_filename": "My Song.mp3",
    "file_size": 2048000,
    "mime_type": "audio/mpeg",
    "upload_status": "pending",
    "created_at": "2025-08-15T05:30:00.000Z",
    "updated_at": "2025-08-15T05:30:00.000Z"
  },
  "timestamp": "2025-08-15T05:38:22.357Z"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "message": "Email is required",
  "timestamp": "2025-08-15T05:38:22.357Z"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Endpoint GET /api/nonexistent not found",
  "timestamp": "2025-08-15T05:38:22.357Z"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed",
  "timestamp": "2025-08-15T05:38:22.357Z"
}
```

## Testing

### Run API Tests
```bash
# Test all basic endpoints
npm run test-api

# Test with curl commands
npm run test-api-curl

# Test file upload functionality
npm run test-upload

# Test upload DoD requirements
npm run test-upload-dod

# Create test audio files
npm run create-test-audio
```

### Manual Testing with curl

```bash
# Health check
curl http://localhost:3001/health

# Get users
curl http://localhost:3001/api/users

# Create user
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","display_name":"Test User"}'

# Get audio files
curl http://localhost:3001/api/audio-files

# Create audio file record
curl -X POST http://localhost:3001/api/audio-files \
  -H "Content-Type: application/json" \
  -d '{"user_id":"USER_ID","filename":"test.mp3","original_filename":"Test.mp3","file_size":1000000}'

# Upload audio file (requires multipart form data)
curl -X POST http://localhost:3001/api/upload \
  -F "audio=@path/to/your/audio.mp3" \
  -F "user_id=USER_ID"
```

## Configuration

The API server uses the following configuration:
- **Port**: 3001 (configurable via PORT environment variable)
- **Supabase URL**: http://127.0.0.1:54321 (local development)
- **CORS**: Enabled for all origins
- **JSON Body Limit**: Default Express limit

## Architecture

- **Framework**: Express.js 4.18.2
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (service role for API operations)
- **Validation**: Basic request validation
- **Error Handling**: Centralized error handling middleware
- **Logging**: Request logging with timestamps
