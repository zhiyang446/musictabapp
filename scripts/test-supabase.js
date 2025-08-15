#!/usr/bin/env node

/**
 * Supabase Connection Test
 * Tests connection to Supabase project and validates configuration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
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
    console.log('❌ Failed to read .env file:', error.message);
    return null;
  }
}

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Load environment variables
  const envVars = loadEnvFile();
  if (!envVars) {
    process.exit(1);
  }
  
  const supabaseUrl = envVars.SUPABASE_URL;
  const supabaseAnonKey = envVars.SUPABASE_ANON_KEY;
  const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
  
  // Validate required variables
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Missing required Supabase configuration:');
    if (!supabaseUrl) console.log('   - SUPABASE_URL');
    if (!supabaseAnonKey) console.log('   - SUPABASE_ANON_KEY');
    console.log('\n💡 Please update your .env file with actual Supabase values');
    process.exit(1);
  }
  
  // Check for placeholder values
  if (supabaseUrl.includes('your-project-id') || supabaseAnonKey.includes('your-anon-key')) {
    console.log('⚠️  Detected placeholder values in Supabase configuration');
    console.log('   Please replace with actual values from your Supabase project');
    console.log('   Visit: https://app.supabase.com/project/YOUR_PROJECT/settings/api');
    process.exit(1);
  }
  
  console.log('📋 Configuration Check:');
  console.log('=======================');
  console.log(`✅ SUPABASE_URL: ${supabaseUrl}`);
  console.log(`✅ SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`);
  if (supabaseServiceKey && !supabaseServiceKey.includes('your-service-role-key')) {
    console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey.substring(0, 20)}...`);
  } else {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY: Not configured or placeholder');
  }
  
  console.log('\n🌐 Testing HTTP Connection:');
  console.log('============================');
  
  try {
    // Test basic HTTP connection
    const response = await fetch(supabaseUrl);
    console.log(`✅ HTTP Status: ${response.status} ${response.statusText}`);
    
    if (response.status !== 200 && response.status !== 301 && response.status !== 302) {
      console.log('⚠️  Unexpected HTTP status. Expected 200, 301, or 302');
    }
  } catch (error) {
    console.log('❌ HTTP connection failed:', error.message);
    process.exit(1);
  }
  
  console.log('\n🔐 Testing Supabase Client:');
  console.log('============================');
  
  try {
    // Create Supabase client with anonymous key
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test anonymous session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Failed to get session:', sessionError.message);
      process.exit(1);
    }
    
    console.log('✅ Supabase client created successfully');
    console.log(`✅ Anonymous session: ${session ? 'Active' : 'None (expected for anonymous)'}`);
    
    // Test a simple query (this might fail if no tables exist, which is OK)
    try {
      const { data, error } = await supabase.from('_test_').select('*').limit(1);
      if (error && !error.message.includes('relation "_test_" does not exist')) {
        console.log('⚠️  Database query test failed:', error.message);
      } else {
        console.log('✅ Database connection test passed');
      }
    } catch (queryError) {
      console.log('⚠️  Database query test failed (this is OK if no tables exist yet)');
    }
    
  } catch (error) {
    console.log('❌ Supabase client test failed:', error.message);
    process.exit(1);
  }
  
  console.log('\n🎉 Supabase Connection Test Results:');
  console.log('=====================================');
  console.log('✅ HTTP connection successful');
  console.log('✅ Supabase client initialization successful');
  console.log('✅ Anonymous session handling working');
  console.log('\n🚀 Ready to proceed with Supabase integration!');
}

// Run the test
testSupabaseConnection().catch(error => {
  console.log('\n💥 Unexpected error:', error.message);
  process.exit(1);
});
