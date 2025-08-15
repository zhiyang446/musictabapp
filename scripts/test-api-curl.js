#!/usr/bin/env node

/**
 * API Endpoints DoD Test Script using curl commands
 * Tests the specific DoD requirements for T11
 */

const { spawn } = require('child_process');

// Helper function to run curl commands
function runCurl(args) {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', args, { shell: true });
    let stdout = '';
    let stderr = '';
    
    curl.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    curl.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    curl.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`curl failed with code ${code}: ${stderr}`));
      }
    });
  });
}

async function testApiWithCurl() {
  console.log('🔍 Testing T11 DoD requirements with curl...\n');
  
  const baseUrl = 'http://localhost:3001';
  let allTestsPassed = true;
  
  try {
    console.log('📊 DoD Test 1: /health endpoint');
    console.log('================================');
    
    // Test /health endpoint
    const healthArgs = [
      '-s', // Silent mode
      '-w', '\\nHTTP_CODE:%{http_code}\\n', // Include HTTP status code
      `${baseUrl}/health`
    ];
    
    const healthResponse = await runCurl(healthArgs);
    const healthLines = healthResponse.trim().split('\n');
    const healthHttpCode = healthLines[healthLines.length - 1].replace('HTTP_CODE:', '');
    const healthBody = healthLines.slice(0, -1).join('\n');
    
    if (healthHttpCode === '200') {
      console.log('✅ /health endpoint returns 200 status code');
      
      try {
        const healthJson = JSON.parse(healthBody);
        console.log('✅ /health returns valid JSON response');
        console.log('   Status:', healthJson.status);
        console.log('   Service:', healthJson.service);
        console.log('   Version:', healthJson.version);
      } catch (error) {
        console.log('❌ /health response is not valid JSON');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ /health endpoint failed - HTTP Code:', healthHttpCode);
      allTestsPassed = false;
    }
    
    console.log('\n👥 DoD Test 2: /api/users endpoint');
    console.log('===================================');
    
    // Test GET /api/users
    const getUsersArgs = [
      '-s',
      '-w', '\\nHTTP_CODE:%{http_code}\\n',
      `${baseUrl}/api/users`
    ];
    
    const getUsersResponse = await runCurl(getUsersArgs);
    const getUsersLines = getUsersResponse.trim().split('\n');
    const getUsersHttpCode = getUsersLines[getUsersLines.length - 1].replace('HTTP_CODE:', '');
    const getUsersBody = getUsersLines.slice(0, -1).join('\n');
    
    if (getUsersHttpCode === '200') {
      console.log('✅ GET /api/users returns 200 status code');
      
      try {
        const usersJson = JSON.parse(getUsersBody);
        console.log('✅ GET /api/users returns valid JSON response');
        console.log('   Success:', usersJson.success);
        console.log('   Count:', usersJson.count);
        console.log('   Data type:', Array.isArray(usersJson.data) ? 'array' : typeof usersJson.data);
      } catch (error) {
        console.log('❌ GET /api/users response is not valid JSON');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ GET /api/users failed - HTTP Code:', getUsersHttpCode);
      allTestsPassed = false;
    }
    
    // Test POST /api/users
    const postUserArgs = [
      '-s',
      '-w', '\\nHTTP_CODE:%{http_code}\\n',
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({
        email: 'curl-test@example.com',
        display_name: 'Curl Test User',
        subscription_tier: 'free'
      }),
      `${baseUrl}/api/users`
    ];
    
    const postUserResponse = await runCurl(postUserArgs);
    const postUserLines = postUserResponse.trim().split('\n');
    const postUserHttpCode = postUserLines[postUserLines.length - 1].replace('HTTP_CODE:', '');
    const postUserBody = postUserLines.slice(0, -1).join('\n');
    
    if (postUserHttpCode === '201') {
      console.log('✅ POST /api/users returns 201 status code');
      
      try {
        const userJson = JSON.parse(postUserBody);
        console.log('✅ POST /api/users returns valid JSON response');
        console.log('   Success:', userJson.success);
        console.log('   User ID:', userJson.data.id);
        console.log('   Email:', userJson.data.email);
      } catch (error) {
        console.log('❌ POST /api/users response is not valid JSON');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ POST /api/users failed - HTTP Code:', postUserHttpCode);
      allTestsPassed = false;
    }
    
    console.log('\n🎵 DoD Test 3: /api/audio-files endpoint');
    console.log('=========================================');
    
    // Test GET /api/audio-files
    const getAudioFilesArgs = [
      '-s',
      '-w', '\\nHTTP_CODE:%{http_code}\\n',
      `${baseUrl}/api/audio-files`
    ];
    
    const getAudioFilesResponse = await runCurl(getAudioFilesArgs);
    const getAudioFilesLines = getAudioFilesResponse.trim().split('\n');
    const getAudioFilesHttpCode = getAudioFilesLines[getAudioFilesLines.length - 1].replace('HTTP_CODE:', '');
    const getAudioFilesBody = getAudioFilesLines.slice(0, -1).join('\n');
    
    if (getAudioFilesHttpCode === '200') {
      console.log('✅ GET /api/audio-files returns 200 status code');
      
      try {
        const audioFilesJson = JSON.parse(getAudioFilesBody);
        console.log('✅ GET /api/audio-files returns valid JSON response');
        console.log('   Success:', audioFilesJson.success);
        console.log('   Count:', audioFilesJson.count);
        console.log('   Data type:', Array.isArray(audioFilesJson.data) ? 'array' : typeof audioFilesJson.data);
      } catch (error) {
        console.log('❌ GET /api/audio-files response is not valid JSON');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ GET /api/audio-files failed - HTTP Code:', getAudioFilesHttpCode);
      allTestsPassed = false;
    }
    
    console.log('\n🔍 DoD Test 4: HTTP Status Codes Verification');
    console.log('==============================================');
    
    // Test 404 endpoint
    const notFoundArgs = [
      '-s',
      '-w', '\\nHTTP_CODE:%{http_code}\\n',
      `${baseUrl}/api/nonexistent-endpoint`
    ];
    
    const notFoundResponse = await runCurl(notFoundArgs);
    const notFoundLines = notFoundResponse.trim().split('\n');
    const notFoundHttpCode = notFoundLines[notFoundLines.length - 1].replace('HTTP_CODE:', '');
    
    if (notFoundHttpCode === '404') {
      console.log('✅ Non-existent endpoint returns 404 status code');
    } else {
      console.log('❌ Non-existent endpoint failed - HTTP Code:', notFoundHttpCode);
      allTestsPassed = false;
    }
    
    // Test invalid POST data
    const invalidPostArgs = [
      '-s',
      '-w', '\\nHTTP_CODE:%{http_code}\\n',
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({}), // Empty data should fail validation
      `${baseUrl}/api/users`
    ];
    
    const invalidPostResponse = await runCurl(invalidPostArgs);
    const invalidPostLines = invalidPostResponse.trim().split('\n');
    const invalidPostHttpCode = invalidPostLines[invalidPostLines.length - 1].replace('HTTP_CODE:', '');
    
    if (invalidPostHttpCode === '400') {
      console.log('✅ Invalid POST data returns 400 status code');
    } else {
      console.log('❌ Invalid POST data failed - HTTP Code:', invalidPostHttpCode);
      allTestsPassed = false;
    }
    
    console.log('\n🎉 T11 DoD Test Results:');
    console.log('=========================');
    
    if (allTestsPassed) {
      console.log('✅ All DoD requirements satisfied:');
      console.log('   ✅ /health endpoint returns 200 and valid JSON');
      console.log('   ✅ /api/users endpoint returns correct HTTP status codes');
      console.log('   ✅ /api/audio-files endpoint returns correct HTTP status codes');
      console.log('   ✅ All endpoints return valid JSON responses');
      console.log('   ✅ Error handling returns appropriate status codes');
      
      console.log('\n🚀 T11 DoD requirements fully satisfied!');
      console.log('📝 All endpoints tested with curl commands');
      return true;
    } else {
      console.log('❌ Some DoD requirements failed');
      return false;
    }
    
  } catch (error) {
    console.log('\n💥 Test failed with error:', error.message);
    console.log('Make sure:');
    console.log('1. API server is running on port 3001');
    console.log('2. curl command is available in your system');
    console.log('3. Local Supabase is running');
    return false;
  }
}

// Run the DoD test
testApiWithCurl().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 DoD test failed:', error.message);
  process.exit(1);
});
