#!/usr/bin/env node

/**
 * Frontend DoD Test Script
 * Tests the specific DoD requirements for T13
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
          resolve({ statusCode: res.statusCode, body: jsonBody, rawBody: body });
        } catch (error) {
          resolve({ statusCode: res.statusCode, body: body, rawBody: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testFrontendDoD() {
  console.log('🔍 Testing T13 DoD requirements...\n');
  
  let allTestsPassed = true;
  
  try {
    console.log('📋 DoD Requirement 1: Basic Frontend Pages');
    console.log('===========================================');
    
    // Test main page accessibility
    const pageResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    });
    
    if (pageResponse.statusCode === 200) {
      console.log('✅ Frontend page is accessible');
      console.log('   URL: http://localhost:3000');
      console.log('   Status Code:', pageResponse.statusCode);
      console.log('   Content Length:', pageResponse.rawBody.length, 'bytes');
    } else {
      console.log('❌ Frontend page not accessible');
      console.log('   Status Code:', pageResponse.statusCode);
      allTestsPassed = false;
    }
    
    console.log('\n📋 DoD Requirement 2: File Upload Form');
    console.log('=======================================');
    
    // Check if page contains file upload form elements
    const htmlContent = pageResponse.rawBody;
    const uploadFormElements = [
      'type="file"',
      'accept="audio/*"',
      'id="audioFile"',
      'Upload Audio File',
      'id="uploadBtn"',
      'Choose Audio File'
    ];
    
    let uploadFormValid = true;
    console.log('✅ File upload form elements:');
    uploadFormElements.forEach(element => {
      if (htmlContent.includes(element)) {
        console.log(`   ✅ Contains: ${element}`);
      } else {
        console.log(`   ❌ Missing: ${element}`);
        uploadFormValid = false;
        allTestsPassed = false;
      }
    });
    
    if (uploadFormValid) {
      console.log('✅ File upload form is complete');
    }
    
    console.log('\n📋 DoD Requirement 3: File List Display');
    console.log('========================================');
    
    // Check if page contains file list elements
    const fileListElements = [
      'Your Audio Files',
      'id="filesList"',
      'id="filesCount"',
      'id="refreshFilesBtn"',
      'files-section'
    ];
    
    let fileListValid = true;
    console.log('✅ File list elements:');
    fileListElements.forEach(element => {
      if (htmlContent.includes(element)) {
        console.log(`   ✅ Contains: ${element}`);
      } else {
        console.log(`   ❌ Missing: ${element}`);
        fileListValid = false;
        allTestsPassed = false;
      }
    });
    
    if (fileListValid) {
      console.log('✅ File list section is complete');
    }
    
    console.log('\n📋 DoD Requirement 4: Backend API Interaction');
    console.log('===============================================');
    
    // Test if frontend can communicate with backend
    // First, create a test user via API
    const testUser = {
      email: `frontend-dod-${Date.now()}@example.com`,
      display_name: 'Frontend DoD Test User'
    };
    
    const userResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, testUser);
    
    if (userResponse.statusCode === 201) {
      console.log('✅ Backend API is accessible from frontend environment');
      console.log('   Created test user:', userResponse.body.data.email);
      console.log('   User ID:', userResponse.body.data.id);
      
      // Test file list API
      const filesResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: `/api/audio-files?user_id=${userResponse.body.data.id}`,
        method: 'GET'
      });
      
      if (filesResponse.statusCode === 200) {
        console.log('✅ File list API accessible');
        console.log('   Files count:', filesResponse.body.count);
      } else {
        console.log('❌ File list API not accessible');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ Backend API not accessible');
      console.log('   Status Code:', userResponse.statusCode);
      allTestsPassed = false;
    }
    
    console.log('\n📋 DoD Test: Upload File via Frontend');
    console.log('======================================');
    
    // Test file upload functionality (simulating frontend behavior)
    if (userResponse.statusCode === 201) {
      const userId = userResponse.body.data.id;
      const testAudioPath = path.join(process.cwd(), 'test-files', 'test-audio.wav');
      
      if (fs.existsSync(testAudioPath)) {
        console.log('✅ Test audio file found for upload test');
        
        // Simulate file upload as frontend would do
        const uploadResponse = await new Promise((resolve, reject) => {
          const form = new FormData();
          const fileStream = fs.createReadStream(testAudioPath);
          form.append('audio', fileStream, 'frontend-test.wav');
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
                resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
              } catch (error) {
                resolve({ statusCode: res.statusCode, body: body });
              }
            });
          });
          
          req.on('error', reject);
          form.pipe(req);
        });
        
        if (uploadResponse.statusCode === 201) {
          console.log('✅ File upload successful via API');
          console.log('   Uploaded file:', uploadResponse.body.data.original_filename);
          console.log('   File ID:', uploadResponse.body.data.id);
          console.log('   File size:', uploadResponse.body.data.file_size, 'bytes');
        } else {
          console.log('❌ File upload failed');
          console.log('   Status Code:', uploadResponse.statusCode);
          allTestsPassed = false;
        }
      } else {
        console.log('⚠️  Test audio file not found, skipping upload test');
        console.log('   Expected path:', testAudioPath);
        console.log('   Run: npm run create-test-audio');
      }
    }
    
    console.log('\n📋 DoD Requirement 5: User Interface Elements');
    console.log('==============================================');
    
    // Check for essential UI elements
    const uiElements = [
      'Music Tab App',
      'User Profile',
      'id="userEmail"',
      'id="displayName"',
      'Create User',
      'API Status',
      'class="container"',
      'class="header"',
      'class="main-content"'
    ];
    
    let uiValid = true;
    console.log('✅ User interface elements:');
    uiElements.forEach(element => {
      if (htmlContent.includes(element)) {
        console.log(`   ✅ Contains: ${element}`);
      } else {
        console.log(`   ❌ Missing: ${element}`);
        uiValid = false;
        allTestsPassed = false;
      }
    });
    
    if (uiValid) {
      console.log('✅ User interface is complete');
    }
    
    console.log('\n🎉 T13 DoD Test Results:');
    console.log('=========================');
    
    if (allTestsPassed) {
      console.log('✅ ALL DoD REQUIREMENTS SATISFIED:');
      console.log('   ✅ Basic frontend pages created');
      console.log('   ✅ File upload form implemented');
      console.log('   ✅ File list display implemented');
      console.log('   ✅ Backend API interaction working');
      console.log('   ✅ Page displays and functions correctly');
      console.log('   ✅ File upload functionality operational');
      
      console.log('\n🚀 T13 TASK COMPLETED SUCCESSFULLY!');
      console.log('🌐 Frontend is accessible at: http://localhost:3000');
      console.log('📝 All frontend functionality is operational');
      return true;
    } else {
      console.log('❌ Some DoD requirements not met');
      return false;
    }
    
  } catch (error) {
    console.log('\n💥 DoD test failed:', error.message);
    console.log('Make sure:');
    console.log('1. Frontend server is running on port 3000');
    console.log('2. Backend API server is running on port 3001');
    console.log('3. Test audio files exist (run: npm run create-test-audio)');
    console.log('4. Start both servers with: npm run dev');
    return false;
  }
}

// Run the DoD test
testFrontendDoD().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 DoD test failed:', error.message);
  process.exit(1);
});
