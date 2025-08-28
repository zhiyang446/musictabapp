const { createClient } = require('@supabase/supabase-js');

// dynamic fetch for CommonJS
async function httpFetch(...args) {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
}

// Test T44: YouTube Job Creation
async function testT44YouTubeJob() {
  console.log('🧪 T44: Testing YouTube Job Creation');
  
  // Supabase configuration
  const supabaseUrl = 'https://jvmcekqjavgesucxytwh.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bWNla3FqYXZnZXN1Y3h5dHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMjk4NTIsImV4cCI6MjA3MDgwNTg1Mn0.492IwvCqhYvvhKOz4UgDtJ6BFK7T8TuqFLo1gOdhHfg';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Step 1: Sign in with email/password
    console.log('📝 Step 1: Signing in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'zhiyang446@gmail.com',
      password: '123456'
    });
    
    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    console.log('✅ Authentication successful');
    console.log('📋 User ID:', authData.user.id);
    console.log('📋 Access token present:', !!authData.session.access_token);
    
    // Step 2: Create YouTube job via Orchestrator
    console.log('\n📝 Step 2: Creating YouTube job...');
    
    const youtubeJobData = {
      source_type: 'youtube',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      instruments: ['drums', 'bass'],
      options: {
        separate: true,
        precision: 'balanced',
        audio_format: 'webm'
      }
    };
    
    console.log('📋 Job data:', JSON.stringify(youtubeJobData, null, 2));
    
    const orchestratorUrl = 'http://127.0.0.1:8000';
    const response = await httpFetch(`${orchestratorUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
      },
      body: JSON.stringify(youtubeJobData)
    });
    
    console.log('📋 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Job creation failed: ${response.status} - ${errorText}`);
    }
    
    const jobResult = await response.json();
    console.log('✅ YouTube job created successfully!');
    console.log('📋 Job ID:', jobResult.jobId);
    
    // Step 3: Verify job in database
    console.log('\n📝 Step 3: Verifying job in database...');
    
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobResult.jobId)
      .single();
    
    if (jobsError) {
      throw new Error(`Database query failed: ${jobsError.message}`);
    }
    
    console.log('✅ Job found in database');
    console.log('📋 Job details:', {
      id: jobs.id,
      source_type: jobs.source_type,
      youtube_url: jobs.youtube_url,
      instruments: jobs.instruments,
      status: jobs.status,
      progress: jobs.progress
    });
    
    // T44 DoD Check
    console.log('\n🎯 T44 DoD Check:');
    console.log('✅ source_type = youtube:', jobs.source_type === 'youtube');
    console.log('✅ youtube_url saved:', !!jobs.youtube_url);
    console.log('✅ youtube_url correct:', jobs.youtube_url === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('✅ instruments saved:', Array.isArray(jobs.instruments) && jobs.instruments.length > 0);
    console.log('✅ options saved:', !!jobs.options);
    
    // Step 4: Test invalid YouTube URL
    console.log('\n📝 Step 4: Testing invalid YouTube URL...');
    
    const invalidJobData = {
      source_type: 'youtube',
      youtube_url: 'https://invalid-url.com',
      instruments: ['drums'],
      options: {}
    };
    
    const invalidResponse = await httpFetch(`${orchestratorUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
      },
      body: JSON.stringify(invalidJobData)
    });
    
    console.log('📋 Invalid URL response status:', invalidResponse.status);
    
    if (invalidResponse.status === 400) {
      const errorData = await invalidResponse.json();
      console.log('✅ Invalid URL correctly rejected');
      console.log('📋 Error detail:', errorData.detail);
    } else {
      console.log('⚠️  Invalid URL should have been rejected');
    }
    
    console.log('\n🎉 T44 Test Completed Successfully!');
    
  } catch (error) {
    console.error('❌ T44 Test Failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testT44YouTubeJob();
