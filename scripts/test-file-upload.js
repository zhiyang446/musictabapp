#!/usr/bin/env node

/**
 * File Upload Test Script
 * Tests the /api/upload endpoint with various scenarios
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// Helper function to make multipart form requests
function uploadFile(filePath, userId, filename = null) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    
    // Add the file
    const fileStream = fs.createReadStream(filePath);
    form.append('audio', fileStream, filename || path.basename(filePath));
    
    // Add user_id
    form.append('user_id', userId);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload',
      method: 'POST',
      headers: form.getHeaders()
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ statusCode: res.statusCode, body: jsonBody });
        } catch (error) {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });
    
    req.on('error', reject);
    form.pipe(req);
  });
}

// Helper function to make regular HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ statusCode: res.statusCode, body: jsonBody });
        } catch (error) {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testFileUpload() {
  console.log('🔍 Testing file upload endpoint...\n');
  
  const baseOptions = {
    hostname: 'localhost',
    port: 3001,
    headers: { 'Content-Type': 'application/json' }
  };
  
  let allTestsPassed = true;
  const timestamp = Date.now();
  
  try {
    // First, create a test user for uploads
    console.log('👤 Creating test user for uploads:');
    console.log('==================================');
    
    const testUser = {
      email: `upload-test-${timestamp}@example.com`,
      display_name: 'Upload Test User',
      subscription_tier: 'free'
    };
    
    const createUserResponse = await makeRequest(
      { ...baseOptions, path: '/api/users', method: 'POST' },
      testUser
    );
    
    if (createUserResponse.statusCode !== 201) {
      console.log('❌ Failed to create test user');
      console.log('   Status Code:', createUserResponse.statusCode);
      console.log('   Response:', createUserResponse.body);
      return false;
    }
    
    const userId = createUserResponse.body.data.id;
    console.log('✅ Test user created successfully');
    console.log('   User ID:', userId);
    console.log('   Email:', createUserResponse.body.data.email);
    
    console.log('\n🎵 Test 1: Upload WAV file');
    console.log('===========================');
    
    const wavFilePath = path.join(process.cwd(), 'test-files', 'test-audio.wav');
    
    if (!fs.existsSync(wavFilePath)) {
      console.log('❌ Test WAV file not found. Run: node scripts/create-test-audio.js');
      return false;
    }
    
    const wavUploadResponse = await uploadFile(wavFilePath, userId);
    
    if (wavUploadResponse.statusCode === 201) {
      console.log('✅ WAV file upload successful');
      console.log('   Status Code:', wavUploadResponse.statusCode);
      console.log('   Success:', wavUploadResponse.body.success);
      console.log('   File ID:', wavUploadResponse.body.data.id);
      console.log('   Original filename:', wavUploadResponse.body.data.original_filename);
      console.log('   Stored filename:', wavUploadResponse.body.data.filename);
      console.log('   File size:', wavUploadResponse.body.data.file_size, 'bytes');
      console.log('   MIME type:', wavUploadResponse.body.data.mime_type);
      console.log('   Upload status:', wavUploadResponse.body.data.upload_status);
    } else {
      console.log('❌ WAV file upload failed');
      console.log('   Status Code:', wavUploadResponse.statusCode);
      console.log('   Response:', wavUploadResponse.body);
      allTestsPassed = false;
    }
    
    console.log('\n🎵 Test 2: Upload MP3 file');
    console.log('===========================');
    
    const mp3FilePath = path.join(process.cwd(), 'test-files', 'test-audio.mp3');
    
    if (!fs.existsSync(mp3FilePath)) {
      console.log('❌ Test MP3 file not found. Run: node scripts/create-test-audio.js');
      return false;
    }
    
    const mp3UploadResponse = await uploadFile(mp3FilePath, userId, 'My Test Song.mp3');
    
    if (mp3UploadResponse.statusCode === 201) {
      console.log('✅ MP3 file upload successful');
      console.log('   Status Code:', mp3UploadResponse.statusCode);
      console.log('   Success:', mp3UploadResponse.body.success);
      console.log('   File ID:', mp3UploadResponse.body.data.id);
      console.log('   Original filename:', mp3UploadResponse.body.data.original_filename);
      console.log('   Stored filename:', mp3UploadResponse.body.data.filename);
      console.log('   File size:', mp3UploadResponse.body.data.file_size, 'bytes');
      console.log('   Size (MB):', mp3UploadResponse.body.file_info.size_mb);
    } else {
      console.log('❌ MP3 file upload failed');
      console.log('   Status Code:', mp3UploadResponse.statusCode);
      console.log('   Response:', mp3UploadResponse.body);
      allTestsPassed = false;
    }
    
    console.log('\n❌ Test 3: Upload without user_id (should fail)');
    console.log('================================================');
    
    const noUserUploadResponse = await new Promise((resolve, reject) => {
      const form = new FormData();
      const fileStream = fs.createReadStream(wavFilePath);
      form.append('audio', fileStream, 'test-no-user.wav');
      // Intentionally not adding user_id
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/upload',
        method: 'POST',
        headers: form.getHeaders()
      };
      
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const jsonBody = body ? JSON.parse(body) : {};
            resolve({ statusCode: res.statusCode, body: jsonBody });
          } catch (error) {
            resolve({ statusCode: res.statusCode, body: body });
          }
        });
      });
      
      req.on('error', reject);
      form.pipe(req);
    });
    
    if (noUserUploadResponse.statusCode === 400) {
      console.log('✅ Upload without user_id correctly rejected');
      console.log('   Status Code:', noUserUploadResponse.statusCode);
      console.log('   Error:', noUserUploadResponse.body.error);
      console.log('   Message:', noUserUploadResponse.body.message);
    } else {
      console.log('❌ Upload without user_id should have failed');
      console.log('   Status Code:', noUserUploadResponse.statusCode);
      allTestsPassed = false;
    }
    
    console.log('\n📊 Test 4: Verify uploaded files in database');
    console.log('=============================================');
    
    // Connect to database to verify files were stored
    const supabase = createClient(
      'http://127.0.0.1:54321',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    );
    
    const { data: uploadedFiles, error: dbError } = await supabase
      .from('audio_files')
      .select('id, filename, original_filename, file_size, mime_type, upload_status, storage_path')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (dbError) {
      console.log('❌ Database verification failed:', dbError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ Database verification successful');
      console.log(`   Found ${uploadedFiles.length} uploaded files for user`);
      
      uploadedFiles.forEach((file, index) => {
        console.log(`   File ${index + 1}:`);
        console.log(`     Original: ${file.original_filename}`);
        console.log(`     Stored: ${file.filename}`);
        console.log(`     Size: ${file.file_size} bytes`);
        console.log(`     Type: ${file.mime_type}`);
        console.log(`     Status: ${file.upload_status}`);
        console.log(`     Path: ${file.storage_path}`);
        
        // Verify physical file exists
        if (fs.existsSync(file.storage_path)) {
          console.log(`     Physical file: ✅ exists`);
        } else {
          console.log(`     Physical file: ❌ missing`);
          allTestsPassed = false;
        }
      });
    }
    
    console.log('\n🎉 File Upload Test Results:');
    console.log('=============================');
    
    if (allTestsPassed) {
      console.log('✅ All file upload tests passed:');
      console.log('   ✅ WAV file upload successful');
      console.log('   ✅ MP3 file upload successful');
      console.log('   ✅ Validation errors handled correctly');
      console.log('   ✅ Files stored in database');
      console.log('   ✅ Physical files saved to disk');
      console.log('   ✅ File information returned correctly');
      
      console.log('\n🚀 File upload endpoint is working correctly!');
      return true;
    } else {
      console.log('❌ Some file upload tests failed');
      return false;
    }
    
  } catch (error) {
    console.log('\n💥 Test failed with error:', error.message);
    console.log('Make sure:');
    console.log('1. API server is running on port 3001');
    console.log('2. Test audio files exist (run: node scripts/create-test-audio.js)');
    console.log('3. Local Supabase is running');
    return false;
  }
}

// Run the test
testFileUpload().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
  process.exit(1);
});
