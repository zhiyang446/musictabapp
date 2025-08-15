#!/usr/bin/env node

/**
 * Music Tab App API Server
 * Basic REST API endpoints for the Music Tab application
 */

const express = require('express');
const cors = require('cors');
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
