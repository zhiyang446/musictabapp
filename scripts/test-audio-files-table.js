#!/usr/bin/env node

/**
 * Audio Files Table Test Script
 * Tests the audio_files table functionality and foreign key relationships
 */

const { createClient } = require('@supabase/supabase-js');

async function testAudioFilesTable() {
  console.log('🔍 Testing audio_files table...\n');
  
  // Use local Supabase instance with service role key
  const supabaseUrl = 'http://127.0.0.1:54321';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📋 Table Structure Test:');
    console.log('========================');
    
    // Test 1: Check if table exists and is accessible
    const { data: tableData, error: tableError } = await supabase
      .from('audio_files')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Table access failed:', tableError.message);
      return false;
    }
    
    console.log('✅ Audio files table exists and is accessible');
    console.log(`✅ Initial query returned ${tableData.length} rows (expected: 0)`);
    
    console.log('\n👤 Create Test User:');
    console.log('====================');
    
    // Test 2: Create a test user first (required for foreign key)
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    const testUser = {
      id: testUserId,
      email: 'audiotest@example.com',
      display_name: 'Audio Test User'
    };
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([testUser])
      .select();
    
    if (userError) {
      console.log('❌ User creation failed:', userError.message);
      return false;
    }
    
    console.log('✅ Test user created successfully');
    console.log('   User ID:', userData[0].id);
    
    console.log('\n🎵 Audio File Insertion Test:');
    console.log('==============================');
    
    // Test 3: Insert an audio file record
    const testAudioFile = {
      id: '987fcdeb-51a2-43d1-b456-426614174001',
      user_id: testUserId,
      filename: 'test-audio-001.mp3',
      original_filename: 'My Song.mp3',
      file_size: 5242880, // 5MB
      mime_type: 'audio/mpeg',
      duration_seconds: 180.5,
      sample_rate: 44100,
      channels: 2,
      upload_status: 'completed'
    };
    
    const { data: audioData, error: audioError } = await supabase
      .from('audio_files')
      .insert([testAudioFile])
      .select();
    
    if (audioError) {
      console.log('❌ Audio file insertion failed:', audioError.message);
      return false;
    }
    
    console.log('✅ Audio file inserted successfully');
    console.log('   File ID:', audioData[0].id);
    console.log('   User ID:', audioData[0].user_id);
    console.log('   Filename:', audioData[0].filename);
    console.log('   File Size:', audioData[0].file_size, 'bytes');
    console.log('   Duration:', audioData[0].duration_seconds, 'seconds');
    
    console.log('\n🔗 Foreign Key Relationship Test:');
    console.log('==================================');
    
    // Test 4: Verify foreign key relationship with JOIN
    const { data: joinData, error: joinError } = await supabase
      .from('audio_files')
      .select(`
        id,
        filename,
        file_size,
        upload_status,
        users:user_id (
          id,
          email,
          display_name
        )
      `)
      .eq('id', testAudioFile.id);
    
    if (joinError) {
      console.log('❌ Foreign key join failed:', joinError.message);
      return false;
    }
    
    if (joinData.length === 0) {
      console.log('❌ No data returned from join query');
      return false;
    }
    
    const audioWithUser = joinData[0];
    console.log('✅ Foreign key relationship verified');
    console.log('   Audio File:', audioWithUser.filename);
    console.log('   Owner Email:', audioWithUser.users.email);
    console.log('   Owner Name:', audioWithUser.users.display_name);
    
    console.log('\n📊 Data Validation Test:');
    console.log('=========================');
    
    // Test 5: Verify all required fields are present
    const requiredFields = ['id', 'user_id', 'filename', 'file_size', 'upload_status'];
    const audioFile = audioData[0];
    
    let allFieldsPresent = true;
    requiredFields.forEach(field => {
      if (audioFile[field] === undefined || audioFile[field] === null) {
        console.log(`❌ Required field missing: ${field}`);
        allFieldsPresent = false;
      } else {
        console.log(`✅ Required field present: ${field} = ${audioFile[field]}`);
      }
    });
    
    if (!allFieldsPresent) {
      return false;
    }
    
    console.log('\n🔄 Update Test:');
    console.log('================');
    
    // Test 6: Update audio file processing status
    const { data: updateData, error: updateError } = await supabase
      .from('audio_files')
      .update({ 
        processing_status: 'completed',
        error_message: null
      })
      .eq('id', testAudioFile.id)
      .select();
    
    if (updateError) {
      console.log('❌ Audio file update failed:', updateError.message);
      return false;
    }
    
    console.log('✅ Audio file updated successfully');
    console.log('   Processing Status:', updateData[0].processing_status);
    console.log('   Updated At changed:', updateData[0].updated_at !== audioFile.updated_at);
    
    console.log('\n❌ Foreign Key Constraint Test:');
    console.log('================================');
    
    // Test 7: Try to insert audio file with invalid user_id (should fail)
    const invalidAudioFile = {
      user_id: '00000000-0000-0000-0000-000000000000', // Non-existent user
      filename: 'invalid-test.mp3',
      original_filename: 'Invalid Test.mp3',
      file_size: 1000,
      upload_status: 'pending'
    };
    
    const { data: invalidData, error: invalidError } = await supabase
      .from('audio_files')
      .insert([invalidAudioFile]);
    
    if (invalidError) {
      console.log('✅ Foreign key constraint working correctly');
      console.log('   Expected error:', invalidError.message.includes('foreign key') ? 'Foreign key violation' : invalidError.message);
    } else {
      console.log('❌ Foreign key constraint not working - invalid insert succeeded');
      return false;
    }
    
    console.log('\n🧹 Cleanup Test:');
    console.log('=================');
    
    // Test 8: Delete audio file (should work)
    const { error: deleteAudioError } = await supabase
      .from('audio_files')
      .delete()
      .eq('id', testAudioFile.id);
    
    if (deleteAudioError) {
      console.log('❌ Audio file deletion failed:', deleteAudioError.message);
      return false;
    }
    
    console.log('✅ Audio file deleted successfully');
    
    // Test 9: Delete user (should work since audio file is deleted)
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', testUserId);
    
    if (deleteUserError) {
      console.log('❌ User deletion failed:', deleteUserError.message);
      return false;
    }
    
    console.log('✅ Test user deleted successfully');
    
    console.log('\n🎉 Audio Files Table Test Results:');
    console.log('===================================');
    console.log('✅ Table structure is correct');
    console.log('✅ Foreign key relationship to users table works');
    console.log('✅ Data insertion works');
    console.log('✅ Data selection and joins work');
    console.log('✅ Data updates work');
    console.log('✅ Foreign key constraints are enforced');
    console.log('✅ Data deletion works');
    console.log('✅ All required fields present');
    
    console.log('\n🚀 Audio files table is ready for use!');
    return true;
    
  } catch (error) {
    console.log('\n💥 Unexpected error:', error.message);
    return false;
  }
}

// Run the test
testAudioFilesTable().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
  process.exit(1);
});
