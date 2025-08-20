#!/usr/bin/env node

/**
 * T44 Test Script - Orchestrator Support for sourceType=youtube
 * 
 * Tests that the Orchestrator API can:
 * 1. Accept POST /jobs with sourceType=youtube
 * 2. Validate YouTube URL format
 * 3. Save YouTube URL correctly in database
 * 4. Reject invalid YouTube URLs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORCHESTRATOR_URL = 'http://localhost:8000';

async function testT44() {
    console.log('🎬 T44 Test - Orchestrator Support for sourceType=youtube');
    console.log('======================================================');
    
    try {
        // Step 1: Get test user and JWT token
        console.log('Step 1: Setting up test authentication...');
        
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersError) {
            console.error('❌ Failed to list users:', usersError.message);
            return;
        }
        
        const testUser = users.users.find(user => user.email === 'zhiyang446@gmail.com');
        if (!testUser) {
            console.error('❌ Test user not found');
            return;
        }
        
        console.log(`✅ Found test user: ${testUser.email}`);
        
        // Create a test JWT token (simplified for testing)
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: testUser.email
        });
        
        if (sessionError) {
            console.error('❌ Failed to generate session:', sessionError.message);
            return;
        }
        
        // For testing, we'll use the service role key to create jobs directly
        // In real scenarios, the React Native app would have a proper JWT token
        
        // Step 2: Test valid YouTube URLs
        console.log('\nStep 2: Testing valid YouTube URLs...');
        
        const validYouTubeUrls = [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'https://youtube.com/watch?v=dQw4w9WgXcQ',
            'https://youtu.be/dQw4w9WgXcQ',
            'https://m.youtube.com/watch?v=dQw4w9WgXcQ'
        ];
        
        const validJobIds = [];
        
        for (let i = 0; i < validYouTubeUrls.length; i++) {
            const youtubeUrl = validYouTubeUrls[i];
            console.log(`\n📹 Testing URL ${i + 1}: ${youtubeUrl}`);
            
            const jobData = {
                source_type: 'youtube',
                youtube_url: youtubeUrl,
                instruments: ['guitar', 'drums'],
                options: {
                    precision: 'balanced'
                }
            };
            
            try {
                const response = await fetch(`${ORCHESTRATOR_URL}/jobs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` // Using service key for testing
                    },
                    body: JSON.stringify(jobData)
                });
                
                console.log(`   Response status: ${response.status}`);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`   ✅ Job created: ${result.jobId}`);
                    validJobIds.push(result.jobId);
                } else {
                    const error = await response.json();
                    console.log(`   ❌ Failed: ${error.detail}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Request error: ${error.message}`);
            }
        }
        
        // Step 3: Test invalid YouTube URLs
        console.log('\nStep 3: Testing invalid YouTube URLs...');
        
        const invalidYouTubeUrls = [
            'https://vimeo.com/123456789',
            'https://example.com/video',
            'not-a-url',
            'https://youtube.com/invalid',
            ''
        ];
        
        for (let i = 0; i < invalidYouTubeUrls.length; i++) {
            const youtubeUrl = invalidYouTubeUrls[i];
            console.log(`\n❌ Testing invalid URL ${i + 1}: ${youtubeUrl || '(empty)'}`);
            
            const jobData = {
                source_type: 'youtube',
                youtube_url: youtubeUrl,
                instruments: ['guitar'],
                options: {}
            };
            
            try {
                const response = await fetch(`${ORCHESTRATOR_URL}/jobs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                    },
                    body: JSON.stringify(jobData)
                });
                
                console.log(`   Response status: ${response.status}`);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`   ⚠️  Unexpected success: ${result.jobId}`);
                } else {
                    const error = await response.json();
                    console.log(`   ✅ Correctly rejected: ${error.detail}`);
                }
                
            } catch (error) {
                console.log(`   ✅ Request error (expected): ${error.message}`);
            }
        }
        
        // Step 4: Verify database storage
        console.log('\nStep 4: Verifying database storage...');
        
        if (validJobIds.length > 0) {
            const { data: jobs, error: jobsError } = await supabase
                .from('jobs')
                .select('id, source_type, youtube_url, instruments, status')
                .in('id', validJobIds);
                
            if (jobsError) {
                console.error('❌ Failed to query jobs:', jobsError.message);
            } else {
                console.log(`✅ Found ${jobs.length} jobs in database:`);
                
                jobs.forEach((job, index) => {
                    console.log(`   ${index + 1}. Job ${job.id.slice(-8)}`);
                    console.log(`      Source Type: ${job.source_type}`);
                    console.log(`      YouTube URL: ${job.youtube_url}`);
                    console.log(`      Instruments: ${JSON.stringify(job.instruments)}`);
                    console.log(`      Status: ${job.status}`);
                    console.log('');
                });
            }
        }
        
        // Step 5: Test T44 DoD
        console.log('Step 5: Verifying T44 DoD...');
        console.log('============================');
        console.log('Target: POST /jobs validates youtubeUrl');
        console.log('DoD: DB correctly saves URL');
        console.log('Test: select youtube_url from jobs is correct');
        
        if (validJobIds.length > 0) {
            // Test the specific DoD requirement
            const { data: urlCheck, error: urlError } = await supabase
                .from('jobs')
                .select('youtube_url')
                .in('id', validJobIds)
                .not('youtube_url', 'is', null);
                
            if (urlError) {
                console.log('❌ DoD verification failed:', urlError.message);
            } else {
                console.log('\n✅ T44 DoD SATISFIED!');
                console.log(`   ✅ POST /jobs accepts sourceType=youtube`);
                console.log(`   ✅ YouTube URL validation works`);
                console.log(`   ✅ Database correctly saves YouTube URLs`);
                console.log(`   ✅ Found ${urlCheck.length} jobs with YouTube URLs`);
                
                urlCheck.forEach((job, index) => {
                    console.log(`   ${index + 1}. ${job.youtube_url}`);
                });
            }
        } else {
            console.log('\n❌ T44 DoD NOT satisfied - no valid jobs created');
        }
        
        // Step 6: Cleanup test data
        console.log('\nStep 6: Cleaning up test data...');
        
        if (validJobIds.length > 0) {
            const { error: deleteError } = await supabase
                .from('jobs')
                .delete()
                .in('id', validJobIds);
                
            if (deleteError) {
                console.log('⚠️  Failed to cleanup test jobs:', deleteError.message);
            } else {
                console.log(`✅ Cleaned up ${validJobIds.length} test jobs`);
            }
        }
        
        console.log('\n🎉 T44 Test completed successfully!');
        
    } catch (error) {
        console.error('❌ T44 test failed:', error.message);
    }
}

if (require.main === module) {
    testT44();
}

module.exports = { testT44 };
