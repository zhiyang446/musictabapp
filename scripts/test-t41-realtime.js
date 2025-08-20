#!/usr/bin/env node

/**
 * Test T41 Realtime - Simulate job progress updates
 * 
 * This script will simulate a job progressing through different states
 * so you can see the T41 realtime functionality in action
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testT41Realtime() {
    console.log('🔄 Test T41 Realtime - Simulate Job Progress');
    console.log('=============================================');
    
    try {
        // Step 1: Find a PENDING job for zhiyang446@gmail.com
        console.log('Step 1: Finding a PENDING job to simulate...');
        
        // Get user ID
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersError) {
            console.error('❌ Failed to list users:', usersError.message);
            return;
        }
        
        const targetUser = users.users.find(user => user.email === 'zhiyang446@gmail.com');
        if (!targetUser) {
            console.error('❌ User not found');
            return;
        }
        
        const userId = targetUser.id;
        console.log(`✅ Found user: ${targetUser.email}`);
        
        // Find PENDING jobs
        const { data: pendingJobs, error: jobsError } = await supabase
            .from('jobs')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'PENDING')
            .limit(1);
            
        if (jobsError) {
            console.error('❌ Failed to query jobs:', jobsError.message);
            return;
        }
        
        if (!pendingJobs || pendingJobs.length === 0) {
            console.log('❌ No PENDING jobs found');
            console.log('   Creating a new PENDING job for testing...');
            
            const newJob = await createTestJob(userId);
            if (!newJob) return;
            
            pendingJobs.push(newJob);
        }
        
        const testJob = pendingJobs[0];
        console.log(`✅ Using job: ${testJob.id}`);
        console.log(`   Current status: ${testJob.status} (${testJob.progress}%)`);
        
        // Step 2: Instructions for user
        console.log('\n📱 T41 Testing Instructions:');
        console.log('============================');
        console.log('1. Open the React Native app in your browser');
        console.log('2. Navigate to the job details page for:');
        console.log(`   Job ID: ${testJob.id}`);
        console.log('3. Keep the page open and watch the status section');
        console.log('4. You should see "Live" indicator (green dot)');
        console.log('5. Press ENTER here to start the simulation...');
        
        // Wait for user input
        await waitForEnter();
        
        // Step 3: Simulate job progress
        console.log('\n🚀 Starting job progress simulation...');
        console.log('Watch the React Native app for real-time updates!');
        
        await simulateJobProgress(testJob.id);
        
        console.log('\n🎉 T41 Realtime test completed!');
        console.log('   You should have seen the job status and progress update in real-time');
        
    } catch (error) {
        console.error('❌ T41 test failed:', error.message);
    }
}

async function createTestJob(userId) {
    console.log('📝 Creating test job for realtime simulation...');
    
    const testJobData = {
        user_id: userId,
        source_type: 'upload',
        source_object_path: 'audio-input/t41-realtime-test.wav',
        instruments: ['guitar'],
        options: {
            separate: false,
            precision: 'fast'
        },
        status: 'PENDING',
        progress: 0
    };
    
    const { data: newJob, error: createError } = await supabase
        .from('jobs')
        .insert(testJobData)
        .select()
        .single();
        
    if (createError) {
        console.error('❌ Failed to create test job:', createError.message);
        return null;
    }
    
    console.log(`✅ Created test job: ${newJob.id}`);
    return newJob;
}

async function simulateJobProgress(jobId) {
    const progressSteps = [
        { status: 'QUEUED', progress: 0, message: 'Job queued for processing' },
        { status: 'RUNNING', progress: 10, message: 'Starting audio analysis' },
        { status: 'RUNNING', progress: 25, message: 'Preprocessing audio' },
        { status: 'RUNNING', progress: 50, message: 'Extracting guitar parts' },
        { status: 'RUNNING', progress: 75, message: 'Generating MIDI' },
        { status: 'RUNNING', progress: 90, message: 'Creating score' },
        { status: 'SUCCEEDED', progress: 100, message: 'Job completed successfully' }
    ];
    
    for (let i = 0; i < progressSteps.length; i++) {
        const step = progressSteps[i];
        
        console.log(`\n⏳ Step ${i + 1}/${progressSteps.length}: ${step.message}`);
        console.log(`   Status: ${step.status}, Progress: ${step.progress}%`);
        
        // Update the job in database
        const { error: updateError } = await supabase
            .from('jobs')
            .update({
                status: step.status,
                progress: step.progress,
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
            
        if (updateError) {
            console.error(`❌ Failed to update job: ${updateError.message}`);
            continue;
        }
        
        console.log('✅ Database updated - check the app for real-time changes!');
        
        // Wait between updates
        if (i < progressSteps.length - 1) {
            await sleep(3000); // 3 seconds between updates
        }
    }
    
    // Add some artifacts for the completed job
    if (progressSteps[progressSteps.length - 1].status === 'SUCCEEDED') {
        console.log('\n📦 Adding artifacts to completed job...');
        await addArtifactsToJob(jobId);
    }
}

async function addArtifactsToJob(jobId) {
    const artifacts = [
        {
            job_id: jobId,
            kind: 'midi',
            instrument: 'guitar',
            storage_path: `outputs/${jobId}/guitar.mid`,
            bytes: 2048
        },
        {
            job_id: jobId,
            kind: 'pdf',
            instrument: 'guitar',
            storage_path: `outputs/${jobId}/guitar.pdf`,
            bytes: 51200
        }
    ];
    
    for (const artifact of artifacts) {
        const { error } = await supabase
            .from('artifacts')
            .insert(artifact);
            
        if (error) {
            console.error(`❌ Failed to create artifact: ${error.message}`);
        } else {
            console.log(`✅ Created ${artifact.kind} artifact`);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForEnter() {
    return new Promise(resolve => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', () => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            resolve();
        });
    });
}

if (require.main === module) {
    testT41Realtime();
}

module.exports = { testT41Realtime };
