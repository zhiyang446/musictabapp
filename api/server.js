#!/usr/bin/env node

/**
 * Music Tab App API Server
 * Basic REST API endpoints for the Music Tab application
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const envVars = {};
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          envVars[key] = value;
        }
      }
    });
    return envVars;
  } catch (error) {
    console.log('Warning: Could not read .env file, using defaults');
    return {};
  }
}

const envVars = loadEnvFile();

// Configuration - Force local Supabase for development
const config = {
  port: process.env.PORT || 3001,
  supabaseUrl: 'http://127.0.0.1:54321', // Always use local Supabase
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  supabaseServiceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
};

// Initialize Supabase clients
const supabase = createClient(config.supabaseUrl, config.supabaseKey);
const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey);

// Initialize Express app
const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${timestamp}_${sanitizedName}${ext}`);
  }
});

// File filter for audio files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
    'audio/m4a',
    'audio/mp4'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only audio files are allowed. Received: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Only one file at a time
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'music-tab-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    supabase: {
      url: config.supabaseUrl,
      connected: true
    }
  });
});

// Users API endpoints
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, subscription_tier, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Users fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch users',
        message: error.message
      });
    }

    res.status(200).json({
      success: true,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Users endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { email, display_name, subscription_tier } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email is required'
      });
    }

    const userData = {
      email,
      display_name: display_name || null,
      subscription_tier: subscription_tier || 'free'
    };

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([userData])
      .select();

    if (error) {
      console.error('User creation error:', error);
      return res.status(400).json({
        error: 'Failed to create user',
        message: error.message
      });
    }

    res.status(201).json({
      success: true,
      data: data[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('User creation endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Audio files API endpoints
app.get('/api/audio-files', async (req, res) => {
  try {
    const { user_id } = req.query;

    let query = supabaseAdmin
      .from('audio_files')
      .select(`
        id,
        filename,
        original_filename,
        file_size,
        upload_status,
        processing_status,
        duration_seconds,
        created_at,
        updated_at,
        users!inner (
          id,
          email,
          display_name
        )
      `)
      .order('created_at', { ascending: false });

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Audio files fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch audio files',
        message: error.message
      });
    }

    res.status(200).json({
      success: true,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Audio files endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.post('/api/audio-files', async (req, res) => {
  try {
    const { user_id, filename, original_filename, file_size, mime_type } = req.body;

    if (!user_id || !filename || !original_filename || !file_size) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'user_id, filename, original_filename, and file_size are required'
      });
    }

    const audioFileData = {
      user_id,
      filename,
      original_filename,
      file_size: parseInt(file_size),
      mime_type: mime_type || null,
      upload_status: 'pending'
    };

    const { data, error } = await supabaseAdmin
      .from('audio_files')
      .insert([audioFileData])
      .select();

    if (error) {
      console.error('Audio file creation error:', error);
      return res.status(400).json({
        error: 'Failed to create audio file record',
        message: error.message
      });
    }

    res.status(201).json({
      success: true,
      data: data[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Audio file creation endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select an audio file to upload',
        timestamp: new Date().toISOString()
      });
    }

    const { user_id } = req.body;

    if (!user_id) {
      // Clean up uploaded file if user_id is missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Validation error',
        message: 'user_id is required',
        timestamp: new Date().toISOString()
      });
    }

    // Verify user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      // Clean up uploaded file if user doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Invalid user',
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    // Create audio file record in database
    const audioFileData = {
      user_id: user_id,
      filename: req.file.filename,
      original_filename: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      storage_path: req.file.path,
      upload_status: 'completed'
    };

    const { data: audioFile, error: audioError } = await supabaseAdmin
      .from('audio_files')
      .insert([audioFileData])
      .select()
      .single();

    if (audioError) {
      console.error('Audio file database error:', audioError);
      // Clean up uploaded file if database insert fails
      fs.unlinkSync(req.file.path);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to save file information',
        timestamp: new Date().toISOString()
      });
    }

    // Return success response with file information
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: audioFile.id,
        filename: audioFile.filename,
        original_filename: audioFile.original_filename,
        file_size: audioFile.file_size,
        mime_type: audioFile.mime_type,
        upload_status: audioFile.upload_status,
        created_at: audioFile.created_at
      },
      file_info: {
        size_mb: (req.file.size / (1024 * 1024)).toFixed(2),
        type: req.file.mimetype,
        encoding: req.file.encoding
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload endpoint error:', error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Upload failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Transcription jobs API endpoints
app.get('/api/transcription-jobs', async (req, res) => {
  try {
    const { user_id, audio_file_id } = req.query;

    let query = supabaseAdmin
      .from('transcription_jobs')
      .select(`
        id,
        audio_file_id,
        status,
        target_instrument,
        output_format,
        progress_percentage,
        created_at,
        updated_at,
        started_at,
        completed_at,
        error_message,
        confidence_score,
        audio_files!inner (
          id,
          filename,
          original_filename,
          file_size,
          users!inner (
            id,
            email,
            display_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (user_id) {
      query = query.eq('audio_files.user_id', user_id);
    }

    if (audio_file_id) {
      query = query.eq('audio_file_id', audio_file_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Transcription jobs fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch transcription jobs',
        message: error.message
      });
    }

    res.status(200).json({
      success: true,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transcription jobs endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.post('/api/transcription-jobs', async (req, res) => {
  try {
    const { audio_file_id, target_instrument, output_format } = req.body;

    if (!audio_file_id || !target_instrument || !output_format) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'audio_file_id, target_instrument, and output_format are required'
      });
    }

    // Verify audio file exists and get user info
    const { data: audioFile, error: audioError } = await supabaseAdmin
      .from('audio_files')
      .select(`
        id,
        user_id,
        filename,
        original_filename,
        upload_status,
        users!inner (
          id,
          email
        )
      `)
      .eq('id', audio_file_id)
      .single();

    if (audioError || !audioFile) {
      return res.status(400).json({
        error: 'Invalid audio file',
        message: 'Audio file not found'
      });
    }

    if (audioFile.upload_status !== 'completed') {
      return res.status(400).json({
        error: 'Invalid audio file status',
        message: 'Audio file must be fully uploaded before creating transcription job'
      });
    }

    // Validate target instrument
    const validInstruments = ['drums', 'bass', 'guitar', 'piano', 'vocals', 'mixed'];
    if (!validInstruments.includes(target_instrument)) {
      return res.status(400).json({
        error: 'Invalid target instrument',
        message: `Target instrument must be one of: ${validInstruments.join(', ')}`
      });
    }

    // Validate output format
    const validFormats = ['musicxml', 'midi', 'pdf'];
    if (!validFormats.includes(output_format)) {
      return res.status(400).json({
        error: 'Invalid output format',
        message: `Output format must be one of: ${validFormats.join(', ')}`
      });
    }

    const transcriptionJobData = {
      audio_file_id,
      target_instrument,
      output_format,
      status: 'pending',
      progress_percentage: 0
    };

    const { data: transcriptionJob, error: jobError } = await supabaseAdmin
      .from('transcription_jobs')
      .insert([transcriptionJobData])
      .select()
      .single();

    if (jobError) {
      console.error('Transcription job creation error:', jobError);
      return res.status(500).json({
        error: 'Failed to create transcription job',
        message: jobError.message
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: transcriptionJob.id,
        audio_file_id: transcriptionJob.audio_file_id,
        target_instrument: transcriptionJob.target_instrument,
        output_format: transcriptionJob.output_format,
        status: transcriptionJob.status,
        progress_percentage: transcriptionJob.progress_percentage,
        created_at: transcriptionJob.created_at
      },
      audio_file: {
        filename: audioFile.filename,
        original_filename: audioFile.original_filename,
        user_email: audioFile.users.email
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Transcription job creation endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`🚀 Music Tab API Server running on port ${config.port}`);
  console.log(`📊 Health check: http://localhost:${config.port}/health`);
  console.log(`👥 Users API: http://localhost:${config.port}/api/users`);
  console.log(`🎵 Audio Files API: http://localhost:${config.port}/api/audio-files`);
  console.log(`🔗 Supabase URL: ${config.supabaseUrl}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
