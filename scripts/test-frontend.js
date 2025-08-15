#!/usr/bin/env node

/**
 * Frontend Test Script
 * Tests the frontend server and basic functionality
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

// Helper function to make HTTP requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testFrontend() {
  console.log('🔍 Testing frontend server and pages...\n');
  
  const frontendUrl = 'http://localhost:3000';
  let allTestsPassed = true;
  
  try {
    console.log('📋 Test 1: Frontend Server Accessibility');
    console.log('=========================================');
    
    // Test main page
    const indexResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    });
    
    if (indexResponse.statusCode === 200) {
      console.log('✅ Frontend server is accessible');
      console.log('✅ Main page (/) returns 200 status code');
      console.log('   Content-Type:', indexResponse.headers['content-type']);
      console.log('   Content-Length:', indexResponse.headers['content-length'], 'bytes');
      
      // Check if HTML contains expected elements
      if (indexResponse.body.includes('Music Tab App') && 
          indexResponse.body.includes('Upload Audio File') &&
          indexResponse.body.includes('Your Audio Files')) {
        console.log('✅ Main page contains expected content');
      } else {
        console.log('❌ Main page missing expected content');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ Frontend server not accessible');
      console.log('   Status Code:', indexResponse.statusCode);
      allTestsPassed = false;
    }
    
    console.log('\n📋 Test 2: Static Assets');
    console.log('=========================');
    
    // Test CSS file
    const cssResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/styles.css',
      method: 'GET'
    });
    
    if (cssResponse.statusCode === 200) {
      console.log('✅ CSS file accessible');
      console.log('   Content-Type:', cssResponse.headers['content-type']);
      
      if (cssResponse.body.includes('.container') && cssResponse.body.includes('.btn')) {
        console.log('✅ CSS file contains expected styles');
      } else {
        console.log('❌ CSS file missing expected styles');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ CSS file not accessible');
      console.log('   Status Code:', cssResponse.statusCode);
      allTestsPassed = false;
    }
    
    // Test JavaScript file
    const jsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/app.js',
      method: 'GET'
    });
    
    if (jsResponse.statusCode === 200) {
      console.log('✅ JavaScript file accessible');
      console.log('   Content-Type:', jsResponse.headers['content-type']);
      
      if (jsResponse.body.includes('MusicTabApp') && jsResponse.body.includes('uploadFile')) {
        console.log('✅ JavaScript file contains expected functionality');
      } else {
        console.log('❌ JavaScript file missing expected functionality');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ JavaScript file not accessible');
      console.log('   Status Code:', jsResponse.statusCode);
      allTestsPassed = false;
    }
    
    console.log('\n📋 Test 3: Error Handling');
    console.log('==========================');
    
    // Test 404 page
    const notFoundResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/nonexistent.html',
      method: 'GET'
    });
    
    if (notFoundResponse.statusCode === 404) {
      console.log('✅ 404 error handling works correctly');
      console.log('   Status Code:', notFoundResponse.statusCode);
      
      if (notFoundResponse.body.includes('404') && notFoundResponse.body.includes('File not found')) {
        console.log('✅ 404 page contains appropriate error message');
      } else {
        console.log('❌ 404 page missing error message');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ 404 error handling not working');
      console.log('   Status Code:', notFoundResponse.statusCode);
      allTestsPassed = false;
    }
    
    console.log('\n📋 Test 4: File Structure Verification');
    console.log('=======================================');
    
    // Check if all required files exist
    const requiredFiles = [
      'frontend/index.html',
      'frontend/styles.css',
      'frontend/app.js',
      'frontend/server.js'
    ];
    
    let allFilesExist = true;
    requiredFiles.forEach(filePath => {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`✅ ${filePath} exists (${stats.size} bytes)`);
      } else {
        console.log(`❌ ${filePath} missing`);
        allFilesExist = false;
        allTestsPassed = false;
      }
    });
    
    if (allFilesExist) {
      console.log('✅ All required frontend files exist');
    }
    
    console.log('\n📋 Test 5: HTML Structure Validation');
    console.log('=====================================');
    
    // Check HTML structure
    const htmlContent = indexResponse.body;
    const requiredElements = [
      'DOCTYPE html',
      '<title>Music Tab App',
      'id="userEmail"',
      'id="audioFile"',
      'id="uploadBtn"',
      'id="filesList"',
      'class="container"',
      'class="upload-section"',
      'class="files-section"'
    ];
    
    let htmlStructureValid = true;
    requiredElements.forEach(element => {
      if (htmlContent.includes(element)) {
        console.log(`✅ HTML contains: ${element}`);
      } else {
        console.log(`❌ HTML missing: ${element}`);
        htmlStructureValid = false;
        allTestsPassed = false;
      }
    });
    
    if (htmlStructureValid) {
      console.log('✅ HTML structure is valid');
    }
    
    console.log('\n🎉 Frontend Test Results:');
    console.log('==========================');
    
    if (allTestsPassed) {
      console.log('✅ All frontend tests passed:');
      console.log('   ✅ Frontend server is accessible');
      console.log('   ✅ Main page loads correctly');
      console.log('   ✅ Static assets (CSS, JS) are served');
      console.log('   ✅ Error handling works (404 pages)');
      console.log('   ✅ All required files exist');
      console.log('   ✅ HTML structure is valid');
      console.log('   ✅ Page contains file upload form');
      console.log('   ✅ Page contains file list section');
      
      console.log('\n🚀 Frontend is ready for use!');
      console.log(`🌐 Open ${frontendUrl} in your browser to test the interface`);
      return true;
    } else {
      console.log('❌ Some frontend tests failed');
      return false;
    }
    
  } catch (error) {
    console.log('\n💥 Frontend test failed:', error.message);
    console.log('Make sure:');
    console.log('1. Frontend server is running on port 3000');
    console.log('2. All frontend files exist in the frontend/ directory');
    console.log('3. Start the frontend with: npm run frontend:start');
    return false;
  }
}

// Run the test
testFrontend().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
  process.exit(1);
});
