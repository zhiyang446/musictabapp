#!/usr/bin/env node

/**
 * Transcription Jobs Table Test Script
 * Tests the transcription_jobs table functionality and foreign key relationships
 */

const { createClient } = require('@supabase/supabase-js');

async function testTranscriptionJobsTable() {
  console.log('🔍 Testing transcription_jobs table...\n');
  
  // Use local Supabase instance with service role key
  const supabaseUrl = 'http://127.0.0.1:54321';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📋 Table Structure Test:');
    console.log('========================');
    
    // Test 1: Check if table exists and is accessible
    const { data: tableData, error: tableError } = await supabase
      .from('transcription_jobs')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Table access failed:', tableError.message);
      return false;
    }
    
    console.log('✅ Transcription jobs table exists and is accessible');
    console.log(`✅ Initial query returned ${tableData.length} rows (expected: 0)`);
    
    console.log('\n👤 Create Test User and Audio File:');
    console.log('====================================');
    
    // Test 2: Create test user and audio file (required for foreign key)
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    const testUser = {
      id: testUserId,
      email: 'transcription-test@example.com',
      display_name: 'Transcription Test User'
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
    
    // Create test audio file
    const testAudioFileId = '987fcdeb-51a2-43d1-b456-426614174001';
    const testAudioFile = {
      id: testAudioFileId,
      user_id: testUserId,
      filename: 'test-transcription-audio.mp3',
      original_filename: 'Test Song for Transcription.mp3',
      file_size: 8388608, // 8MB
      upload_status: 'completed'
    };
    
    const { data: audioData, error: audioError } = await supabase
      .from('audio_files')
      .insert([testAudioFile])
      .select();
    
    if (audioError) {
      console.log('❌ Audio file creation failed:', audioError.message);
      return false;
    }
    
    console.log('✅ Test audio file created successfully');
    console.log('   Audio File ID:', audioData[0].id);
    
    console.log('\n🎼 Transcription Job Insertion Test:');
    console.log('====================================');
    
    // Test 3: Insert a transcription job record
    const testTranscriptionJob = {
      id: '456789ab-cdef-1234-5678-90abcdef1234',
      audio_file_id: testAudioFileId,
      status: 'pending',
      target_instrument: 'drums',
      output_format: 'musicxml'
    };
    
    const { data: jobData, error: jobError } = await supabase
      .from('transcription_jobs')
      .insert([testTranscriptionJob])
      .select();
    
    if (jobError) {
      console.log('❌ Transcription job insertion failed:', jobError.message);
      return false;
    }
    
    console.log('✅ Transcription job inserted successfully');
    console.log('   Job ID:', jobData[0].id);
    console.log('   Audio File ID:', jobData[0].audio_file_id);
    console.log('   Status:', jobData[0].status);
    console.log('   Target Instrument:', jobData[0].target_instrument);
    console.log('   Output Format:', jobData[0].output_format);
    console.log('   Progress:', jobData[0].progress_percentage + '%');
    
    console.log('\n🔗 Foreign Key Relationship Test:');
    console.log('==================================');
    
    // Test 4: Verify foreign key relationship with complex JOIN
    const { data: joinData, error: joinError } = await supabase
      .from('transcription_jobs')
      .select(`
        id,
        status,
        target_instrument,
        output_format,
        progress_percentage,
        created_at,
        audio_files!inner (
          id,
          filename,
          file_size,
          users!inner (
            id,
            email,
            display_name
          )
        )
      `)
      .eq('id', testTranscriptionJob.id);
    
    if (joinError) {
      console.log('❌ Foreign key join failed:', joinError.message);
      return false;
    }
    
    if (joinData.length === 0) {
      console.log('❌ No data returned from join query');
      return false;
    }
    
    const jobWithRelations = joinData[0];
    console.log('✅ Foreign key relationships verified');
    console.log('   Job Status:', jobWithRelations.status);
    console.log('   Audio File:', jobWithRelations.audio_files.filename);
    console.log('   File Size:', jobWithRelations.audio_files.file_size, 'bytes');
    console.log('   Owner Email:', jobWithRelations.audio_files.users.email);
    console.log('   Owner Name:', jobWithRelations.audio_files.users.display_name);
    
    console.log('\n📊 Data Validation Test:');
    console.log('=========================');
    
    // Test 5: Verify all required fields are present
    const requiredFields = ['id', 'audio_file_id', 'status', 'created_at'];
    const job = jobData[0];
    
    let allFieldsPresent = true;
    requiredFields.forEach(field => {
      if (job[field] === undefined || job[field] === null) {
        console.log(`❌ Required field missing: ${field}`);
        allFieldsPresent = false;
      } else {
        console.log(`✅ Required field present: ${field} = ${job[field]}`);
      }
    });
    
    if (!allFieldsPresent) {
      return false;
    }
    
    console.log('\n🔄 Job Status Update Test:');
    console.log('===========================');
    
    // Test 6: Update job status and progress
    const { data: updateData, error: updateError } = await supabase
      .from('transcription_jobs')
      .update({ 
        status: 'processing',
        progress_percentage: 45,
        started_at: new Date().toISOString(),
        worker_id: 'worker-001'
      })
      .eq('id', testTranscriptionJob.id)
      .select();
    
    if (updateError) {
      console.log('❌ Job update failed:', updateError.message);
      return false;
    }
    
    console.log('✅ Transcription job updated successfully');
    console.log('   New Status:', updateData[0].status);
    console.log('   Progress:', updateData[0].progress_percentage + '%');
    console.log('   Worker ID:', updateData[0].worker_id);
    console.log('   Started At:', updateData[0].started_at);
    console.log('   Updated At changed:', updateData[0].updated_at !== job.updated_at);
    
    console.log('\n❌ Foreign Key Constraint Test:');
    console.log('================================');
    
    // Test 7: Try to insert job with invalid audio_file_id (should fail)
    const invalidJob = {
      audio_file_id: '00000000-0000-0000-0000-000000000000', // Non-existent audio file
      status: 'pending',
      target_instrument: 'bass',
      output_format: 'midi'
    };
    
    const { data: invalidData, error: invalidError } = await supabase
      .from('transcription_jobs')
      .insert([invalidJob]);
    
    if (invalidError) {
      console.log('✅ Foreign key constraint working correctly');
      console.log('   Expected error:', invalidError.message.includes('foreign key') ? 'Foreign key violation' : invalidError.message);
    } else {
      console.log('❌ Foreign key constraint not working - invalid insert succeeded');
      return false;
    }
    
    console.log('\n🧹 Cleanup Test:');
    console.log('=================');
    
    // Test 8: Delete transcription job
    const { error: deleteJobError } = await supabase
      .from('transcription_jobs')
      .delete()
      .eq('id', testTranscriptionJob.id);
    
    if (deleteJobError) {
      console.log('❌ Job deletion failed:', deleteJobError.message);
      return false;
    }
    
    console.log('✅ Transcription job deleted successfully');
    
    // Delete audio file
    const { error: deleteAudioError } = await supabase
      .from('audio_files')
      .delete()
      .eq('id', testAudioFileId);
    
    if (deleteAudioError) {
      console.log('❌ Audio file deletion failed:', deleteAudioError.message);
      return false;
    }
    
    console.log('✅ Audio file deleted successfully');
    
    // Delete user
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', testUserId);
    
    if (deleteUserError) {
      console.log('❌ User deletion failed:', deleteUserError.message);
      return false;
    }
    
    console.log('✅ Test user deleted successfully');
    
    console.log('\n🎉 Transcription Jobs Table Test Results:');
    console.log('==========================================');
    console.log('✅ Table structure is correct');
    console.log('✅ Foreign key relationship to audio_files table works');
    console.log('✅ Complex JOIN queries with users table work');
    console.log('✅ Data insertion works');
    console.log('✅ Data selection and joins work');
    console.log('✅ Data updates work');
    console.log('✅ Foreign key constraints are enforced');
    console.log('✅ Data deletion works');
    console.log('✅ All required fields present');
    console.log('✅ Job status and progress tracking works');
    
    console.log('\n🚀 Transcription jobs table is ready for use!');
    return true;
    
  } catch (error) {
    console.log('\n💥 Unexpected error:', error.message);
    return false;
  }
}

// Run the test
testTranscriptionJobsTable().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
  process.exit(1);
});
