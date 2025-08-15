#!/usr/bin/env node

/**
 * Transcription Jobs Test Script
 * Tests the transcription job creation and management functionality
 */

const http = require('http');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Helper function to make HTTP requests
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

// Helper function to upload file
function uploadFile(filePath, userId) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    const fileStream = fs.createReadStream(filePath);
    form.append('audio', fileStream, path.basename(filePath));
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

async function testTranscriptionJobs() {
  console.log('🔍 Testing transcription jobs functionality...\n');
  
  const timestamp = Date.now();
  let allTestsPassed = true;
  
  try {
    console.log('📋 Test 1: Create test user and upload audio file');
    console.log('==================================================');
    
    // Create test user
    const testUser = {
      email: `transcription-test-${timestamp}@example.com`,
      display_name: 'Transcription Test User'
    };
    
    const userResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, testUser);
    
    if (userResponse.statusCode !== 201) {
      console.log('❌ Failed to create test user');
      return false;
    }
    
    const userId = userResponse.body.data.id;
    console.log('✅ Test user created:', userResponse.body.data.email);
    
    // Upload test audio file
    const testAudioPath = path.join(process.cwd(), 'test-files', 'test-audio.wav');
    if (!fs.existsSync(testAudioPath)) {
      console.log('❌ Test audio file not found');
      console.log('   Run: npm run create-test-audio');
      return false;
    }
    
    const uploadResponse = await uploadFile(testAudioPath, userId);
    if (uploadResponse.statusCode !== 201) {
      console.log('❌ Failed to upload test audio file');
      return false;
    }
    
    const audioFileId = uploadResponse.body.data.id;
    console.log('✅ Test audio file uploaded:', uploadResponse.body.data.original_filename);
    
    console.log('\n📋 Test 2: Create transcription job');
    console.log('====================================');
    
    // Test transcription job creation
    const jobData = {
      audio_file_id: audioFileId,
      target_instrument: 'guitar',
      output_format: 'musicxml'
    };
    
    const jobResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/transcription-jobs',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, jobData);
    
    if (jobResponse.statusCode === 201) {
      console.log('✅ Transcription job created successfully');
      console.log('   Job ID:', jobResponse.body.data.id);
      console.log('   Target Instrument:', jobResponse.body.data.target_instrument);
      console.log('   Output Format:', jobResponse.body.data.output_format);
      console.log('   Status:', jobResponse.body.data.status);
      console.log('   Audio File:', jobResponse.body.audio_file.original_filename);
    } else {
      console.log('❌ Failed to create transcription job');
      console.log('   Status Code:', jobResponse.statusCode);
      console.log('   Error:', jobResponse.body.message);
      allTestsPassed = false;
    }
    
    console.log('\n📋 Test 3: Retrieve transcription jobs');
    console.log('=======================================');
    
    // Test getting transcription jobs
    const jobsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/transcription-jobs?user_id=${userId}`,
      method: 'GET'
    });
    
    if (jobsResponse.statusCode === 200) {
      console.log('✅ Transcription jobs retrieved successfully');
      console.log('   Jobs count:', jobsResponse.body.count);
      
      if (jobsResponse.body.data.length > 0) {
        const job = jobsResponse.body.data[0];
        console.log('   First job:');
        console.log('     ID:', job.id);
        console.log('     Status:', job.status);
        console.log('     Target:', job.target_instrument);
        console.log('     Format:', job.output_format);
        console.log('     Audio File:', job.audio_files.original_filename);
      }
    } else {
      console.log('❌ Failed to retrieve transcription jobs');
      allTestsPassed = false;
    }
    
    console.log('\n📋 Test 4: Validation tests');
    console.log('============================');
    
    // Test missing fields
    const invalidJobResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/transcription-jobs',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { audio_file_id: audioFileId });
    
    if (invalidJobResponse.statusCode === 400) {
      console.log('✅ Validation correctly rejects incomplete data');
      console.log('   Error message:', invalidJobResponse.body.message);
    } else {
      console.log('❌ Validation should reject incomplete data');
      allTestsPassed = false;
    }
    
    // Test invalid instrument
    const invalidInstrumentResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/transcription-jobs',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      audio_file_id: audioFileId,
      target_instrument: 'invalid_instrument',
      output_format: 'musicxml'
    });
    
    if (invalidInstrumentResponse.statusCode === 400) {
      console.log('✅ Validation correctly rejects invalid instrument');
    } else {
      console.log('❌ Validation should reject invalid instrument');
      allTestsPassed = false;
    }
    
    // Test invalid format
    const invalidFormatResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/transcription-jobs',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      audio_file_id: audioFileId,
      target_instrument: 'guitar',
      output_format: 'invalid_format'
    });
    
    if (invalidFormatResponse.statusCode === 400) {
      console.log('✅ Validation correctly rejects invalid format');
    } else {
      console.log('❌ Validation should reject invalid format');
      allTestsPassed = false;
    }
    
    console.log('\n📋 Test 5: Multiple transcription jobs');
    console.log('=======================================');
    
    // Create multiple jobs with different settings
    const jobConfigs = [
      { target_instrument: 'drums', output_format: 'midi' },
      { target_instrument: 'bass', output_format: 'pdf' },
      { target_instrument: 'piano', output_format: 'musicxml' }
    ];
    
    for (const config of jobConfigs) {
      const multiJobResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/transcription-jobs',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        audio_file_id: audioFileId,
        ...config
      });
      
      if (multiJobResponse.statusCode === 201) {
        console.log(`✅ Created ${config.target_instrument} → ${config.output_format} job`);
      } else {
        console.log(`❌ Failed to create ${config.target_instrument} job`);
        allTestsPassed = false;
      }
    }
    
    // Verify all jobs were created
    const finalJobsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/transcription-jobs?user_id=${userId}`,
      method: 'GET'
    });
    
    if (finalJobsResponse.statusCode === 200) {
      console.log('✅ Final jobs count:', finalJobsResponse.body.count);
      console.log('   Expected: 4 jobs (1 initial + 3 additional)');
    }
    
    console.log('\n🎉 Transcription Jobs Test Results:');
    console.log('====================================');
    
    if (allTestsPassed) {
      console.log('✅ All transcription job tests passed:');
      console.log('   ✅ User creation and file upload successful');
      console.log('   ✅ Transcription job creation working');
      console.log('   ✅ Job retrieval and listing working');
      console.log('   ✅ Input validation working correctly');
      console.log('   ✅ Multiple jobs with different settings');
      console.log('   ✅ All API endpoints responding correctly');
      
      console.log('\n🚀 Transcription job functionality is working correctly!');
      return true;
    } else {
      console.log('❌ Some transcription job tests failed');
      return false;
    }
    
  } catch (error) {
    console.log('\n💥 Transcription job test failed:', error.message);
    return false;
  }
}

testTranscriptionJobs().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
  process.exit(1);
});
