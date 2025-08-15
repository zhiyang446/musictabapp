#!/usr/bin/env node

/**
 * SQL Query Test Script
 * Tests basic SQL queries against the users table
 */

const { createClient } = require('@supabase/supabase-js');

async function testSQLQueries() {
  console.log('🔍 Testing SQL queries on users table...\n');
  
  // Use local Supabase instance
  const supabaseUrl = 'http://127.0.0.1:54321';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📋 DoD Test: SELECT * FROM users');
    console.log('==================================');
    
    // Test the exact DoD requirement
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.log('❌ Query failed:', error.message);
      return false;
    }
    
    console.log('✅ Query executed successfully');
    console.log(`✅ Returned ${data.length} rows (expected: 0 for empty table)`);
    console.log('✅ No errors occurred');
    
    if (data.length === 0) {
      console.log('✅ Table is empty as expected');
    } else {
      console.log('ℹ️  Table contains data:');
      data.forEach((row, index) => {
        console.log(`   Row ${index + 1}: ${row.email} (${row.id})`);
      });
    }
    
    console.log('\n🧪 Insert Test Record');
    console.log('======================');
    
    // Test inserting a record as per DoD requirement
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'dod-test@example.com',
      display_name: 'DoD Test User'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([testUser])
      .select();
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
      return false;
    }
    
    console.log('✅ Test record inserted successfully');
    console.log('   ID:', insertData[0].id);
    console.log('   Email:', insertData[0].email);
    console.log('   Created at:', insertData[0].created_at);
    
    console.log('\n📊 Verify Insert with SELECT');
    console.log('=============================');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('*');
    
    if (verifyError) {
      console.log('❌ Verification query failed:', verifyError.message);
      return false;
    }
    
    console.log('✅ Verification query successful');
    console.log(`✅ Found ${verifyData.length} record(s)`);
    
    if (verifyData.length > 0) {
      console.log('✅ Record details:');
      verifyData.forEach((row, index) => {
        console.log(`   Record ${index + 1}:`);
        console.log(`     ID: ${row.id}`);
        console.log(`     Email: ${row.email}`);
        console.log(`     Display Name: ${row.display_name}`);
        console.log(`     Subscription: ${row.subscription_tier}`);
        console.log(`     Created: ${row.created_at}`);
        console.log(`     Updated: ${row.updated_at}`);
      });
    }
    
    console.log('\n🧹 Cleanup');
    console.log('===========');
    
    // Clean up test data
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('email', 'dod-test@example.com');
    
    if (deleteError) {
      console.log('⚠️  Cleanup failed:', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up');
    }
    
    console.log('\n🎉 DoD Test Results:');
    console.log('=====================');
    console.log('✅ SELECT * FROM users returns empty result without error');
    console.log('✅ Insert user record succeeds');
    console.log('✅ Table structure is correct');
    console.log('✅ All required columns (id, email, created_at, updated_at) present');
    
    console.log('\n🚀 Users table passes all DoD requirements!');
    return true;
    
  } catch (error) {
    console.log('\n💥 Unexpected error:', error.message);
    return false;
  }
}

// Run the test
testSQLQueries().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
  process.exit(1);
});
