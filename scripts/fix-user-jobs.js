#!/usr/bin/env node

/**
 * Fix User Jobs - Assign SUCCEEDED jobs to zhiyang446@gmail.com
 * 
 * This script will:
 * 1. Find the user ID for zhiyang446@gmail.com
 * 2. Create a new SUCCEEDED job for this user
 * 3. Add artifacts to the job for T42 testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUserJobs() {
    console.log('🔧 Fix User Jobs - Assign to zhiyang446@gmail.com');
    console.log('=================================================');
    
    try {
        // Step 1: Find user ID for zhiyang446@gmail.com
        console.log('Step 1: Finding user ID for zhiyang446@gmail.com...');
        
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
            console.error('❌ Failed to list users:', usersError.message);
            return;
        }
        
        const targetUser = users.users.find(user => user.email === 'zhiyang446@gmail.com');
        
        if (!targetUser) {
            console.error('❌ User zhiyang446@gmail.com not found');
            console.log('Available users:');
            users.users.forEach(user => {
                console.log(`   - ${user.email} (${user.id.slice(-8)})`);
            });
            return;
        }
        
        const userId = targetUser.id;
        console.log(`✅ Found user: ${targetUser.email}`);
        console.log(`   User ID: ${userId}`);
        
        // Step 2: Check existing jobs for this user
        console.log('\nStep 2: Checking existing jobs for this user...');
        
        const { data: existingJobs, error: jobsError } = await supabase
            .from('jobs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
        if (jobsError) {
            console.error('❌ Failed to query user jobs:', jobsError.message);
            return;
        }
        
        console.log(`📋 Found ${existingJobs.length} existing jobs for this user:`);
        existingJobs.forEach((job, index) => {
            console.log(`   ${index + 1}. ${job.id.slice(-8)} - ${job.status} (${job.progress}%)`);
        });
        
        const succeededJobs = existingJobs.filter(job => job.status === 'SUCCEEDED');
        console.log(`✅ SUCCEEDED jobs: ${succeededJobs.length}`);
        
        if (succeededJobs.length > 0) {
            console.log('✅ User already has SUCCEEDED jobs! Let\'s add artifacts to them...');
            
            // Add artifacts to existing SUCCEEDED jobs
            for (const job of succeededJobs) {
                await addArtifactsToJob(job.id);
            }
        } else {
            console.log('📝 Creating new SUCCEEDED job for this user...');
            
            // Step 3: Create a new SUCCEEDED job
            const testJobData = {
                user_id: userId,
                source_type: 'upload',
                source_object_path: 'audio-input/zhiyang-test-demo.wav',
                instruments: ['guitar', 'drums', 'piano'],
                options: {
                    separate: true,
                    precision: 'high'
                },
                status: 'SUCCEEDED',
                progress: 100
            };
            
            const { data: newJob, error: createError } = await supabase
                .from('jobs')
                .insert(testJobData)
                .select()
                .single();
                
            if (createError) {
                console.error('❌ Failed to create job:', createError.message);
                return;
            }
            
            console.log(`✅ Created new SUCCEEDED job: ${newJob.id}`);
            
            // Step 4: Add artifacts to the new job
            await addArtifactsToJob(newJob.id);
        }
        
        console.log('\n🎉 User jobs fixed successfully!');
        console.log('   Now refresh the React Native app to see SUCCEEDED jobs');
        
    } catch (error) {
        console.error('❌ Failed to fix user jobs:', error.message);
    }
}

async function addArtifactsToJob(jobId) {
    console.log(`\n📦 Adding artifacts to job ${jobId}...`);
    
    // First, check if artifacts already exist
    const { data: existingArtifacts, error: checkError } = await supabase
        .from('artifacts')
        .select('*')
        .eq('job_id', jobId);
        
    if (checkError) {
        console.error('❌ Failed to check existing artifacts:', checkError.message);
        return;
    }
    
    if (existingArtifacts && existingArtifacts.length > 0) {
        console.log(`✅ Job already has ${existingArtifacts.length} artifacts`);
        existingArtifacts.forEach((artifact, index) => {
            console.log(`   ${index + 1}. ${artifact.kind} (${artifact.instrument || 'general'})`);
        });
        return;
    }
    
    const testArtifacts = [
        {
            job_id: jobId,
            kind: 'midi',
            instrument: 'guitar',
            storage_path: `outputs/${jobId}/guitar.mid`,
            bytes: 2048
        },
        {
            job_id: jobId,
            kind: 'musicxml',
            instrument: 'guitar',
            storage_path: `outputs/${jobId}/guitar.musicxml`,
            bytes: 4096
        },
        {
            job_id: jobId,
            kind: 'pdf',
            instrument: 'guitar',
            storage_path: `outputs/${jobId}/guitar.pdf`,
            bytes: 51200
        },
        {
            job_id: jobId,
            kind: 'midi',
            instrument: 'drums',
            storage_path: `outputs/${jobId}/drums.mid`,
            bytes: 1536
        },
        {
            job_id: jobId,
            kind: 'pdf',
            instrument: 'drums',
            storage_path: `outputs/${jobId}/drums.pdf`,
            bytes: 48000
        },
        {
            job_id: jobId,
            kind: 'midi',
            instrument: 'piano',
            storage_path: `outputs/${jobId}/piano.mid`,
            bytes: 1800
        },
        {
            job_id: jobId,
            kind: 'musicxml',
            instrument: 'piano',
            storage_path: `outputs/${jobId}/piano.musicxml`,
            bytes: 3500
        },
        {
            job_id: jobId,
            kind: 'preview',
            instrument: null,
            storage_path: `outputs/${jobId}/preview.mp3`,
            bytes: 1024000
        }
    ];
    
    for (const artifact of testArtifacts) {
        const { error: artifactError } = await supabase
            .from('artifacts')
            .insert(artifact);
            
        if (artifactError) {
            console.error(`❌ Failed to create ${artifact.kind} artifact:`, artifactError.message);
        } else {
            console.log(`✅ Created ${artifact.kind} artifact (${artifact.instrument || 'general'})`);
        }
    }
    
    console.log(`✅ Added ${testArtifacts.length} artifacts to job ${jobId}`);
}

if (require.main === module) {
    fixUserJobs();
}

module.exports = { fixUserJobs };
