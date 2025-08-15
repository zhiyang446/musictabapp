#!/usr/bin/env node

/**
 * T14 DoD Test - Transcription Task Creation
 * Tests the specific DoD requirements for T14
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

async function testTranscriptionDoD() {
  console.log('🔍 T14 DoD Test - Transcription Task Creation\n');
  
  let allTestsPassed = true;
  const timestamp = Date.now();
  
  try {
    console.log('📋 DoD Requirement: Add transcription task creation functionality');
    console.log('================================================================');
    
    // Setup: Create user and upload audio file
    const testUser = {
      email: `dod-test-${timestamp}@example.com`,
      display_name: 'DoD Test User'
    };
    
    const userResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, testUser);
    
    if (userResponse.statusCode !== 201) {
      console.log('❌ Failed to create test user for DoD test');
      return false;
    }
    
    const userId = userResponse.body.data.id;
    console.log('✅ Test user created for transcription task testing');
    
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
    console.log('✅ Test audio file uploaded for transcription task');
    
    console.log('\n📋 DoD Test: Can select audio file and create transcription task');
    console.log('================================================================');
    
    // Test transcription task creation
    const transcriptionData = {
      audio_file_id: audioFileId,
      target_instrument: 'guitar',
      output_format: 'musicxml'
    };
    
    const transcriptionResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/transcription-jobs',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, transcriptionData);
    
    if (transcriptionResponse.statusCode === 201) {
      console.log('✅ Transcription task created successfully');
      console.log('   Task ID:', transcriptionResponse.body.data.id);
      console.log('   Audio File Selected:', transcriptionResponse.body.audio_file.original_filename);
      console.log('   Target Instrument:', transcriptionResponse.body.data.target_instrument);
      console.log('   Output Format:', transcriptionResponse.body.data.output_format);
      console.log('   Status:', transcriptionResponse.body.data.status);
      console.log('   Created At:', transcriptionResponse.body.data.created_at);
    } else {
      console.log('❌ Failed to create transcription task');
      console.log('   Status Code:', transcriptionResponse.statusCode);
      console.log('   Error:', transcriptionResponse.body.message);
      allTestsPassed = false;
    }
    
    console.log('\n📋 DoD Verification: Frontend UI elements for transcription');
    console.log('===========================================================');
    
    // Test frontend page contains transcription elements
    const pageResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    });
    
    if (pageResponse.statusCode === 200) {
      const htmlContent = pageResponse.body;
      const transcriptionElements = [
        'Create Transcription Job',
        'id="audioFileSelect"',
        'id="targetInstrument"',
        'id="outputFormat"',
        'id="createJobBtn"',
        'Your Transcription Jobs',
        'id="jobsList"',
        'class="transcription-section"',
        'class="jobs-section"'
      ];
      
      let uiComplete = true;
      console.log('✅ Frontend transcription UI elements:');
      transcriptionElements.forEach(element => {
        if (htmlContent.includes(element)) {
          console.log(`   ✅ ${element}`);
        } else {
          console.log(`   ❌ Missing: ${element}`);
          uiComplete = false;
          allTestsPassed = false;
        }
      });
      
      if (uiComplete) {
        console.log('✅ All transcription UI elements present in frontend');
      }
    } else {
      console.log('❌ Frontend page not accessible');
      allTestsPassed = false;
    }
    
    console.log('\n📋 DoD Test: Create one transcription task successfully');
    console.log('========================================================');
    
    // Verify the created transcription task
    const jobsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/transcription-jobs?user_id=${userId}`,
      method: 'GET'
    });
    
    if (jobsResponse.statusCode === 200 && jobsResponse.body.count > 0) {
      const job = jobsResponse.body.data[0];
      console.log('✅ Transcription task successfully created and retrievable');
      console.log('   Task Details:');
      console.log('     ID:', job.id);
      console.log('     Audio File:', job.audio_files.original_filename);
      console.log('     Target Instrument:', job.target_instrument);
      console.log('     Output Format:', job.output_format);
      console.log('     Status:', job.status);
      console.log('     Progress:', job.progress_percentage + '%');
      console.log('     Created:', new Date(job.created_at).toLocaleString());
    } else {
      console.log('❌ Failed to retrieve created transcription task');
      allTestsPassed = false;
    }
    
    console.log('\n📋 Additional Feature Verification');
    console.log('===================================');
    
    // Test different instrument and format combinations
    const testCombinations = [
      { instrument: 'drums', format: 'midi' },
      { instrument: 'bass', format: 'pdf' },
      { instrument: 'piano', format: 'musicxml' }
    ];
    
    console.log('✅ Testing multiple instrument/format combinations:');
    for (const combo of testCombinations) {
      const comboResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/transcription-jobs',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        audio_file_id: audioFileId,
        target_instrument: combo.instrument,
        output_format: combo.format
      });
      
      if (comboResponse.statusCode === 201) {
        console.log(`   ✅ ${combo.instrument} → ${combo.format}`);
      } else {
        console.log(`   ❌ ${combo.instrument} → ${combo.format}`);
        allTestsPassed = false;
      }
    }
    
    console.log('\n🎉 T14 DoD Test Results');
    console.log('========================');
    
    if (allTestsPassed) {
      console.log('✅ ALL DoD REQUIREMENTS SATISFIED:');
      console.log('   ✅ Transcription task creation functionality added');
      console.log('   ✅ Can select audio files for transcription');
      console.log('   ✅ Can create transcription tasks successfully');
      console.log('   ✅ Frontend UI includes transcription elements');
      console.log('   ✅ Backend API supports transcription jobs');
      console.log('   ✅ Multiple instrument/format combinations supported');
      console.log('   ✅ Task creation test completed successfully');
      
      console.log('\n🚀 T14 TASK COMPLETED SUCCESSFULLY!');
      console.log('📝 Transcription task creation is fully operational');
      console.log('🎵 Users can now create transcription jobs for their audio files');
      return true;
    } else {
      console.log('❌ Some DoD requirements not met');
      return false;
    }
    
  } catch (error) {
    console.log('\n💥 DoD test failed:', error.message);
    return false;
  }
}

testTranscriptionDoD().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
  process.exit(1);
});
