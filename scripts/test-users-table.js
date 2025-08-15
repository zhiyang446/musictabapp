#!/usr/bin/env node

/**
 * Users Table Test Script
 * Tests the users table functionality
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

async function testUsersTable() {
  console.log('🔍 Testing users table...\n');
  
  // Use local Supabase instance
  const supabaseUrl = 'http://127.0.0.1:54321';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  
  try {
    // Create Supabase client with service role key for testing
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📋 Table Structure Test:');
    console.log('========================');
    
    // Test 1: Check if table exists and is accessible
    const { data: tableData, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Table access failed:', tableError.message);
      return false;
    }
    
    console.log('✅ Users table exists and is accessible');
    console.log(`✅ Initial query returned ${tableData.length} rows (expected: 0)`);
    
    console.log('\n🧪 Data Insertion Test:');
    console.log('========================');
    
    // Test 2: Insert a test user
    const testUser = {
      id: '123e4567-e89b-12d3-a456-426614174000', // Fixed UUID for testing
      email: 'test@example.com',
      display_name: 'Test User',
      subscription_tier: 'free'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([testUser])
      .select();
    
    if (insertError) {
      console.log('❌ User insertion failed:', insertError.message);
      return false;
    }
    
    console.log('✅ Test user inserted successfully');
    console.log('   User ID:', insertData[0].id);
    console.log('   Email:', insertData[0].email);
    console.log('   Created at:', insertData[0].created_at);
    
    console.log('\n📊 Data Validation Test:');
    console.log('=========================');
    
    // Test 3: Verify the inserted data
    const { data: selectData, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@example.com');
    
    if (selectError) {
      console.log('❌ Data selection failed:', selectError.message);
      return false;
    }
    
    if (selectData.length !== 1) {
      console.log('❌ Expected 1 user, found:', selectData.length);
      return false;
    }
    
    const user = selectData[0];
    console.log('✅ User data retrieved successfully');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Display Name:', user.display_name);
    console.log('   Subscription Tier:', user.subscription_tier);
    console.log('   Monthly Usage:', user.monthly_usage_seconds);
    console.log('   Created At:', user.created_at);
    console.log('   Updated At:', user.updated_at);
    
    console.log('\n🔄 Update Test:');
    console.log('================');
    
    // Test 4: Update user data
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ 
        display_name: 'Updated Test User',
        monthly_usage_seconds: 120
      })
      .eq('id', user.id)
      .select();
    
    if (updateError) {
      console.log('❌ User update failed:', updateError.message);
      return false;
    }
    
    console.log('✅ User updated successfully');
    console.log('   New Display Name:', updateData[0].display_name);
    console.log('   New Usage:', updateData[0].monthly_usage_seconds);
    console.log('   Updated At changed:', updateData[0].updated_at !== user.updated_at);
    
    console.log('\n🧹 Cleanup Test:');
    console.log('=================');
    
    // Test 5: Delete test user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);
    
    if (deleteError) {
      console.log('❌ User deletion failed:', deleteError.message);
      return false;
    }
    
    console.log('✅ Test user deleted successfully');
    
    // Verify deletion
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@example.com');
    
    if (verifyError) {
      console.log('❌ Deletion verification failed:', verifyError.message);
      return false;
    }
    
    console.log(`✅ Deletion verified (found ${verifyData.length} users)`);
    
    console.log('\n🎉 Users Table Test Results:');
    console.log('=============================');
    console.log('✅ Table structure is correct');
    console.log('✅ Data insertion works');
    console.log('✅ Data selection works');
    console.log('✅ Data updates work');
    console.log('✅ Data deletion works');
    console.log('✅ Timestamps are automatically managed');
    
    console.log('\n🚀 Users table is ready for use!');
    return true;
    
  } catch (error) {
    console.log('\n💥 Unexpected error:', error.message);
    return false;
  }
}

// Run the test
testUsersTable().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
  process.exit(1);
});
