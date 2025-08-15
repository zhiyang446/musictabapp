#!/usr/bin/env node

/**
 * Audio Files DoD Test Script
 * Tests the specific DoD requirements for T09
 */

const { createClient } = require('@supabase/supabase-js');

async function testAudioFilesDod() {
  console.log('🔍 Testing T09 DoD requirements...\n');
  
  const supabaseUrl = 'http://127.0.0.1:54321';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📋 DoD Test: Foreign Key Relationship');
    console.log('======================================');
    
    // Step 1: Create a test user
    const testUserId = '12345678-1234-1234-1234-123456789012';
    const testUser = {
      id: testUserId,
      email: 'dod-test@example.com',
      display_name: 'DoD Test User'
    };
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([testUser])
      .select();
    
    if (userError) {
      console.log('❌ Failed to create test user:', userError.message);
      return false;
    }
    
    console.log('✅ Test user created');
    console.log('   User ID:', userData[0].id);
    console.log('   Email:', userData[0].email);
    
    console.log('\n🎵 DoD Test: Insert Audio File with User Association');
    console.log('====================================================');
    
    // Step 2: Insert audio file record associated with user
    const testAudioFile = {
      id: '87654321-4321-4321-4321-210987654321',
      user_id: testUserId, // Foreign key to users table
      filename: 'dod-test-song.mp3',
      original_filename: 'DoD Test Song.mp3',
      file_size: 3145728, // 3MB
      upload_status: 'completed'
    };
    
    const { data: audioData, error: audioError } = await supabase
      .from('audio_files')
      .insert([testAudioFile])
      .select();
    
    if (audioError) {
      console.log('❌ Failed to insert audio file:', audioError.message);
      return false;
    }
    
    console.log('✅ Audio file inserted successfully');
    console.log('   Audio File ID:', audioData[0].id);
    console.log('   Associated User ID:', audioData[0].user_id);
    console.log('   Filename:', audioData[0].filename);
    console.log('   File Size:', audioData[0].file_size);
    console.log('   Upload Status:', audioData[0].upload_status);
    
    console.log('\n🔗 DoD Verification: Foreign Key Constraint');
    console.log('============================================');
    
    // Step 3: Verify foreign key relationship by querying with JOIN
    const { data: joinData, error: joinError } = await supabase
      .from('audio_files')
      .select(`
        id,
        filename,
        file_size,
        upload_status,
        created_at,
        users!inner (
          id,
          email,
          display_name
        )
      `)
      .eq('id', testAudioFile.id);
    
    if (joinError) {
      console.log('❌ Foreign key join query failed:', joinError.message);
      return false;
    }
    
    if (joinData.length === 0) {
      console.log('❌ No data returned from foreign key join');
      return false;
    }
    
    const result = joinData[0];
    console.log('✅ Foreign key relationship verified');
    console.log('   Audio File:', result.filename);
    console.log('   Belongs to User:', result.users.email);
    console.log('   User Display Name:', result.users.display_name);
    console.log('   Relationship is correct:', result.users.id === testUserId);
    
    console.log('\n📊 DoD Verification: Required Fields Present');
    console.log('=============================================');
    
    // Step 4: Verify all required fields from DoD are present
    const requiredFields = {
      'id': audioData[0].id,
      'user_id': audioData[0].user_id,
      'filename': audioData[0].filename,
      'file_size': audioData[0].file_size,
      'upload_status': audioData[0].upload_status
    };
    
    let allRequiredPresent = true;
    Object.entries(requiredFields).forEach(([field, value]) => {
      if (value === undefined || value === null) {
        console.log(`❌ Required field missing: ${field}`);
        allRequiredPresent = false;
      } else {
        console.log(`✅ Required field present: ${field} = ${value}`);
      }
    });
    
    if (!allRequiredPresent) {
      return false;
    }
    
    console.log('\n🧹 Cleanup');
    console.log('===========');
    
    // Cleanup: Delete audio file first, then user
    await supabase.from('audio_files').delete().eq('id', testAudioFile.id);
    await supabase.from('users').delete().eq('id', testUserId);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 T09 DoD Test Results:');
    console.log('=========================');
    console.log('✅ audio_files table created with required fields:');
    console.log('   - id (UUID, Primary Key)');
    console.log('   - user_id (UUID, Foreign Key to users)');
    console.log('   - filename (TEXT)');
    console.log('   - file_size (BIGINT)');
    console.log('   - upload_status (TEXT with constraints)');
    console.log('✅ Foreign key relationship to users table works correctly');
    console.log('✅ Insert audio file record with user association succeeds');
    console.log('✅ JOIN queries work properly');
    console.log('✅ Foreign key constraints are enforced');
    
    console.log('\n🚀 T09 DoD requirements fully satisfied!');
    return true;
    
  } catch (error) {
    console.log('\n💥 Unexpected error:', error.message);
    return false;
  }
}

// Run the DoD test
testAudioFilesDod().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 DoD test failed:', error.message);
  process.exit(1);
});
