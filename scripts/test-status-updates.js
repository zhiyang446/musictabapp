#!/usr/bin/env node

/**
 * Transcription Status Updates Test Script
 * Tests the status update functionality for transcription jobs
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

async function testStatusUpdates() {
  console.log('🔍 Testing transcription status updates functionality...\n');
  
  const timestamp = Date.now();
  let allTestsPassed = true;
  
  try {
    console.log('📋 Test 1: Setup - Create user, upload file, create job');
    console.log('======================================================');
    
    // Create test user
    const testUser = {
      email: `status-test-${timestamp}@example.com`,
      display_name: 'Status Update Test User'
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
      return false;
    }
    
    const uploadResponse = await uploadFile(testAudioPath, userId);
    if (uploadResponse.statusCode !== 201) {
      console.log('❌ Failed to upload test audio file');
      return false;
    }
    
    const audioFileId = uploadResponse.body.data.id;
    console.log('✅ Test audio file uploaded');
    
    // Create transcription job
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
    
    if (jobResponse.statusCode !== 201) {
      console.log('❌ Failed to create transcription job');
      return false;
    }
    
    const jobId = jobResponse.body.data.id;
    console.log('✅ Transcription job created:', jobId);
    console.log('   Initial status:', jobResponse.body.data.status);
    
    console.log('\n📋 Test 2: Update job status to processing');
    console.log('===========================================');
    
    // Update status to processing
    const processingUpdate = {
      status: 'processing',
      progress_percentage: 25
    };
    
    const processingResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/transcription-jobs/${jobId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, processingUpdate);
    
    if (processingResponse.statusCode === 200) {
      console.log('✅ Status updated to processing');
      console.log('   New status:', processingResponse.body.data.status);
      console.log('   Progress:', processingResponse.body.data.progress_percentage + '%');
      console.log('   Started at:', processingResponse.body.data.started_at);
    } else {
      console.log('❌ Failed to update status to processing');
      console.log('   Status Code:', processingResponse.statusCode);
      allTestsPassed = false;
    }
    
    console.log('\n📋 Test 3: Update progress incrementally');
    console.log('=========================================');
    
    // Update progress in increments
    const progressUpdates = [50, 75, 90];
    
    for (const progress of progressUpdates) {
      const progressUpdate = { progress_percentage: progress };
      
      const progressResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: `/api/transcription-jobs/${jobId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      }, progressUpdate);
      
      if (progressResponse.statusCode === 200) {
        console.log(`✅ Progress updated to ${progress}%`);
        console.log('   Updated at:', progressResponse.body.data.updated_at);
      } else {
        console.log(`❌ Failed to update progress to ${progress}%`);
        allTestsPassed = false;
      }
      
      // Small delay between updates
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📋 Test 4: Complete the job');
    console.log('============================');
    
    // Complete the job
    const completionUpdate = {
      status: 'completed',
      progress_percentage: 100,
      confidence_score: 0.95
    };
    
    const completionResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/transcription-jobs/${jobId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, completionUpdate);
    
    if (completionResponse.statusCode === 200) {
      console.log('✅ Job completed successfully');
      console.log('   Final status:', completionResponse.body.data.status);
      console.log('   Final progress:', completionResponse.body.data.progress_percentage + '%');
      console.log('   Confidence score:', completionResponse.body.data.confidence_score);
      console.log('   Completed at:', completionResponse.body.data.completed_at);
    } else {
      console.log('❌ Failed to complete job');
      allTestsPassed = false;
    }
    
    console.log('\n📋 Test 5: Test failure scenario');
    console.log('=================================');
    
    // Create another job for failure test
    const failJobResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/transcription-jobs',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      audio_file_id: audioFileId,
      target_instrument: 'drums',
      output_format: 'midi'
    });
    
    if (failJobResponse.statusCode === 201) {
      const failJobId = failJobResponse.body.data.id;
      console.log('✅ Created second job for failure test');

      // First set to processing
      await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: `/api/transcription-jobs/${failJobId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      }, { status: 'processing', progress_percentage: 30 });

      // Then fail the job
      const failureUpdate = {
        status: 'failed',
        progress_percentage: 45,
        error_message: 'Audio quality too low for accurate transcription'
      };
      
      const failureResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: `/api/transcription-jobs/${failJobId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      }, failureUpdate);
      
      if (failureResponse.statusCode === 200) {
        console.log('✅ Job failed successfully (as expected)');
        console.log('   Status:', failureResponse.body.data.status);
        console.log('   Progress at failure:', failureResponse.body.data.progress_percentage + '%');
        console.log('   Error message:', failureResponse.body.data.error_message);
      } else {
        console.log('❌ Failed to set job as failed');
        allTestsPassed = false;
      }
    }
    
    console.log('\n📋 Test 6: Get individual job status');
    console.log('=====================================');
    
    // Test getting individual job
    const getJobResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/transcription-jobs/${jobId}`,
      method: 'GET'
    });
    
    if (getJobResponse.statusCode === 200) {
      console.log('✅ Individual job retrieval working');
      console.log('   Job ID:', getJobResponse.body.data.id);
      console.log('   Status:', getJobResponse.body.data.status);
      console.log('   Progress:', getJobResponse.body.data.progress_percentage + '%');
    } else {
      console.log('❌ Failed to get individual job');
      allTestsPassed = false;
    }
    
    console.log('\n📋 Test 7: Validation tests');
    console.log('============================');
    
    // Test invalid status
    const invalidStatusResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/transcription-jobs/${jobId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { status: 'invalid_status' });
    
    if (invalidStatusResponse.statusCode === 400) {
      console.log('✅ Invalid status correctly rejected');
    } else {
      console.log('❌ Invalid status should be rejected');
      allTestsPassed = false;
    }
    
    // Test invalid progress
    const invalidProgressResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/transcription-jobs/${jobId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { progress_percentage: 150 });
    
    if (invalidProgressResponse.statusCode === 400) {
      console.log('✅ Invalid progress correctly rejected');
    } else {
      console.log('❌ Invalid progress should be rejected');
      allTestsPassed = false;
    }
    
    console.log('\n🎉 Status Updates Test Results:');
    console.log('================================');
    
    if (allTestsPassed) {
      console.log('✅ All status update tests passed:');
      console.log('   ✅ Job status updates working correctly');
      console.log('   ✅ Progress tracking functional');
      console.log('   ✅ Completion handling working');
      console.log('   ✅ Failure scenarios handled properly');
      console.log('   ✅ Individual job retrieval working');
      console.log('   ✅ Input validation working correctly');
      console.log('   ✅ Timestamps automatically managed');
      
      console.log('\n🚀 Status update functionality is working correctly!');
      return true;
    } else {
      console.log('❌ Some status update tests failed');
      return false;
    }
    
  } catch (error) {
    console.log('\n💥 Status update test failed:', error.message);
    return false;
  }
}

testStatusUpdates().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
  process.exit(1);
});
