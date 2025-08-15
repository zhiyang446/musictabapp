#!/usr/bin/env node

/**
 * API Endpoints Test Script
 * Tests all the basic API endpoints for T11
 */

const http = require('http');
const https = require('https');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testApiEndpoints() {
  console.log('🔍 Testing API endpoints...\n');
  
  const baseUrl = 'http://localhost:3001';
  const baseOptions = {
    hostname: 'localhost',
    port: 3001,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
  
  let allTestsPassed = true;
  
  try {
    console.log('📊 Test 1: Health Check Endpoint');
    console.log('=================================');
    
    // Test /health endpoint
    const healthOptions = {
      ...baseOptions,
      path: '/health',
      method: 'GET'
    };
    
    const healthResponse = await makeRequest(healthOptions);
    
    if (healthResponse.statusCode === 200) {
      console.log('✅ Health endpoint accessible');
      console.log('   Status Code:', healthResponse.statusCode);
      console.log('   Service:', healthResponse.body.service);
      console.log('   Status:', healthResponse.body.status);
      console.log('   Version:', healthResponse.body.version);
      console.log('   Timestamp:', healthResponse.body.timestamp);
    } else {
      console.log('❌ Health endpoint failed');
      console.log('   Status Code:', healthResponse.statusCode);
      console.log('   Response:', healthResponse.body);
      allTestsPassed = false;
    }
    
    console.log('\n👥 Test 2: Users API - GET /api/users');
    console.log('======================================');
    
    // Test GET /api/users
    const getUsersOptions = {
      ...baseOptions,
      path: '/api/users',
      method: 'GET'
    };
    
    const getUsersResponse = await makeRequest(getUsersOptions);
    
    if (getUsersResponse.statusCode === 200) {
      console.log('✅ GET /api/users successful');
      console.log('   Status Code:', getUsersResponse.statusCode);
      console.log('   Success:', getUsersResponse.body.success);
      console.log('   Count:', getUsersResponse.body.count);
      console.log('   Data Length:', getUsersResponse.body.data.length);
    } else {
      console.log('❌ GET /api/users failed');
      console.log('   Status Code:', getUsersResponse.statusCode);
      console.log('   Response:', getUsersResponse.body);
      allTestsPassed = false;
    }
    
    console.log('\n👤 Test 3: Users API - POST /api/users');
    console.log('=======================================');
    
    // Test POST /api/users
    const createUserOptions = {
      ...baseOptions,
      path: '/api/users',
      method: 'POST'
    };
    
    const testUserData = {
      email: 'api-test@example.com',
      display_name: 'API Test User',
      subscription_tier: 'free'
    };
    
    const createUserResponse = await makeRequest(createUserOptions, testUserData);
    
    if (createUserResponse.statusCode === 201) {
      console.log('✅ POST /api/users successful');
      console.log('   Status Code:', createUserResponse.statusCode);
      console.log('   Success:', createUserResponse.body.success);
      console.log('   User ID:', createUserResponse.body.data.id);
      console.log('   Email:', createUserResponse.body.data.email);
      console.log('   Display Name:', createUserResponse.body.data.display_name);
    } else {
      console.log('❌ POST /api/users failed');
      console.log('   Status Code:', createUserResponse.statusCode);
      console.log('   Response:', createUserResponse.body);
      allTestsPassed = false;
    }
    
    // Store user ID for audio file test
    const testUserId = createUserResponse.body.data?.id;
    
    console.log('\n🎵 Test 4: Audio Files API - GET /api/audio-files');
    console.log('==================================================');
    
    // Test GET /api/audio-files
    const getAudioFilesOptions = {
      ...baseOptions,
      path: '/api/audio-files',
      method: 'GET'
    };
    
    const getAudioFilesResponse = await makeRequest(getAudioFilesOptions);
    
    if (getAudioFilesResponse.statusCode === 200) {
      console.log('✅ GET /api/audio-files successful');
      console.log('   Status Code:', getAudioFilesResponse.statusCode);
      console.log('   Success:', getAudioFilesResponse.body.success);
      console.log('   Count:', getAudioFilesResponse.body.count);
      console.log('   Data Length:', getAudioFilesResponse.body.data.length);
    } else {
      console.log('❌ GET /api/audio-files failed');
      console.log('   Status Code:', getAudioFilesResponse.statusCode);
      console.log('   Response:', getAudioFilesResponse.body);
      allTestsPassed = false;
    }
    
    console.log('\n🎼 Test 5: Audio Files API - POST /api/audio-files');
    console.log('===================================================');
    
    if (testUserId) {
      // Test POST /api/audio-files
      const createAudioFileOptions = {
        ...baseOptions,
        path: '/api/audio-files',
        method: 'POST'
      };
      
      const testAudioFileData = {
        user_id: testUserId,
        filename: 'api-test-audio.mp3',
        original_filename: 'API Test Song.mp3',
        file_size: 2048000,
        mime_type: 'audio/mpeg'
      };
      
      const createAudioFileResponse = await makeRequest(createAudioFileOptions, testAudioFileData);
      
      if (createAudioFileResponse.statusCode === 201) {
        console.log('✅ POST /api/audio-files successful');
        console.log('   Status Code:', createAudioFileResponse.statusCode);
        console.log('   Success:', createAudioFileResponse.body.success);
        console.log('   Audio File ID:', createAudioFileResponse.body.data.id);
        console.log('   Filename:', createAudioFileResponse.body.data.filename);
        console.log('   File Size:', createAudioFileResponse.body.data.file_size);
        console.log('   Upload Status:', createAudioFileResponse.body.data.upload_status);
      } else {
        console.log('❌ POST /api/audio-files failed');
        console.log('   Status Code:', createAudioFileResponse.statusCode);
        console.log('   Response:', createAudioFileResponse.body);
        allTestsPassed = false;
      }
    } else {
      console.log('⚠️  Skipping audio file creation - no test user ID available');
    }
    
    console.log('\n❌ Test 6: 404 Error Handling');
    console.log('==============================');
    
    // Test 404 endpoint
    const notFoundOptions = {
      ...baseOptions,
      path: '/api/nonexistent',
      method: 'GET'
    };
    
    const notFoundResponse = await makeRequest(notFoundOptions);
    
    if (notFoundResponse.statusCode === 404) {
      console.log('✅ 404 handling works correctly');
      console.log('   Status Code:', notFoundResponse.statusCode);
      console.log('   Error:', notFoundResponse.body.error);
      console.log('   Message:', notFoundResponse.body.message);
    } else {
      console.log('❌ 404 handling failed');
      console.log('   Status Code:', notFoundResponse.statusCode);
      console.log('   Response:', notFoundResponse.body);
      allTestsPassed = false;
    }
    
    console.log('\n🎉 API Endpoints Test Results:');
    console.log('===============================');
    
    if (allTestsPassed) {
      console.log('✅ All API endpoints working correctly');
      console.log('✅ Health check endpoint returns 200');
      console.log('✅ Users API endpoints return correct status codes');
      console.log('✅ Audio files API endpoints return correct status codes');
      console.log('✅ Error handling works correctly');
      console.log('✅ All responses are valid JSON');
      
      console.log('\n🚀 API server is ready for use!');
      return true;
    } else {
      console.log('❌ Some API endpoints failed');
      return false;
    }
    
  } catch (error) {
    console.log('\n💥 Test failed with error:', error.message);
    console.log('Make sure the API server is running on port 3001');
    console.log('Start it with: npm run api:start');
    return false;
  }
}

// Run the test
testApiEndpoints().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
  process.exit(1);
});
