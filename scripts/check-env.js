#!/usr/bin/env node

/**
 * Environment Variables Checker
 * Validates that all required environment variables are present
 */

const fs = require('fs');
const path = require('path');

// Required environment variables
const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'API_BASE_URL',
  'JWT_SECRET'
];

// Optional but recommended variables
const RECOMMENDED_VARS = [
  'REDIS_URL',
  'NODE_ENV',
  'CORS_ORIGINS',
  'MAX_FILE_SIZE'
];

function loadEnvFile(filePath) {
  try {
    const envContent = fs.readFileSync(filePath, 'utf8');
    const envVars = {};
    
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
    return null;
  }
}

function checkEnvironment() {
  console.log('🔍 Checking environment variables...\n');
  
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    if (fs.existsSync(envExamplePath)) {
      console.log('💡 Run: cp .env.example .env');
      console.log('   Then edit .env with your actual values');
    }
    process.exit(1);
  }
  
  // Load environment variables
  const envVars = loadEnvFile(envPath);
  if (!envVars) {
    console.log('❌ Failed to read .env file');
    process.exit(1);
  }
  
  console.log('✅ .env file found and readable\n');
  
  // Check required variables
  let missingRequired = [];
  let emptyRequired = [];
  
  REQUIRED_VARS.forEach(varName => {
    if (!(varName in envVars)) {
      missingRequired.push(varName);
    } else if (!envVars[varName] || envVars[varName].includes('your-') || envVars[varName].includes('localhost')) {
      emptyRequired.push(varName);
    }
  });
  
  // Check recommended variables
  let missingRecommended = [];
  
  RECOMMENDED_VARS.forEach(varName => {
    if (!(varName in envVars)) {
      missingRecommended.push(varName);
    }
  });
  
  // Report results
  console.log('📋 Environment Variables Status:');
  console.log('================================');
  
  if (missingRequired.length === 0 && emptyRequired.length === 0) {
    console.log('✅ All required variables are present and configured');
  } else {
    if (missingRequired.length > 0) {
      console.log('❌ Missing required variables:');
      missingRequired.forEach(varName => {
        console.log(`   - ${varName}`);
      });
    }
    
    if (emptyRequired.length > 0) {
      console.log('⚠️  Required variables with placeholder values:');
      emptyRequired.forEach(varName => {
        console.log(`   - ${varName}: ${envVars[varName]}`);
      });
    }
  }
  
  if (missingRecommended.length > 0) {
    console.log('\n💡 Missing recommended variables:');
    missingRecommended.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Required: ${REQUIRED_VARS.length - missingRequired.length - emptyRequired.length}/${REQUIRED_VARS.length} configured`);
  console.log(`   Recommended: ${RECOMMENDED_VARS.length - missingRecommended.length}/${RECOMMENDED_VARS.length} present`);
  
  // Exit with appropriate code
  if (missingRequired.length > 0 || emptyRequired.length > 0) {
    console.log('\n❌ Environment check failed');
    process.exit(1);
  } else {
    console.log('\n✅ Environment check passed');
    process.exit(0);
  }
}

// Run the check
checkEnvironment();
