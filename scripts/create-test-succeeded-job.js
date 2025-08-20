#!/usr/bin/env node

/**
 * Create Test SUCCEEDED Job with Artifacts
 * 
 * Creates a test job with SUCCEEDED status and sample artifacts for T42 testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestSucceededJob() {
    console.log('🏗️ Creating Test SUCCEEDED Job for T42');
    console.log('=====================================');
    
    try {
        // Step 1: Get a user ID from existing jobs
        console.log('Step 1: Finding user ID from existing jobs...');
        
        const { data: existingJobs, error: jobsError } = await supabase
            .from('jobs')
            .select('user_id')
            .limit(1);
            
        if (jobsError || !existingJobs || existingJobs.length === 0) {
            console.error('❌ No existing jobs found to get user_id');
            return;
        }
        
        const userId = existingJobs[0].user_id;
        console.log(`✅ Using user ID: ${userId}`);
        
        // Step 2: Create a test job with SUCCEEDED status
        console.log('\nStep 2: Creating SUCCEEDED test job...');
        
        const testJobData = {
            user_id: userId,
            source_type: 'upload',
            source_object_path: 'audio-input/test-t42-demo.wav',
            instruments: ['guitar', 'drums'],
            options: {
                separate: true,
                precision: 'balanced'
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
            console.error('❌ Failed to create test job:', createError.message);
            return;
        }
        
        console.log(`✅ Created test job: ${newJob.id}`);
        
        // Step 3: Create sample artifacts
        console.log('\nStep 3: Creating sample artifacts...');
        
        const testArtifacts = [
            {
                job_id: newJob.id,
                kind: 'midi',
                instrument: 'guitar',
                storage_path: `outputs/${newJob.id}/guitar.mid`,
                bytes: 2048
            },
            {
                job_id: newJob.id,
                kind: 'musicxml',
                instrument: 'guitar',
                storage_path: `outputs/${newJob.id}/guitar.musicxml`,
                bytes: 4096
            },
            {
                job_id: newJob.id,
                kind: 'pdf',
                instrument: 'guitar',
                storage_path: `outputs/${newJob.id}/guitar.pdf`,
                bytes: 51200
            },
            {
                job_id: newJob.id,
                kind: 'midi',
                instrument: 'drums',
                storage_path: `outputs/${newJob.id}/drums.mid`,
                bytes: 1536
            },
            {
                job_id: newJob.id,
                kind: 'pdf',
                instrument: 'drums',
                storage_path: `outputs/${newJob.id}/drums.pdf`,
                bytes: 48000
            },
            {
                job_id: newJob.id,
                kind: 'preview',
                instrument: null,
                storage_path: `outputs/${newJob.id}/preview.mp3`,
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
        
        // Step 4: Provide testing instructions
        console.log('\n🎯 T42 Testing Ready!');
        console.log('====================');
        console.log(`📋 Test Job ID: ${newJob.id}`);
        console.log(`📊 Status: ${newJob.status}`);
        console.log(`📈 Progress: ${newJob.progress}%`);
        console.log(`📦 Artifacts: ${testArtifacts.length} created`);
        
        console.log('\n📱 Testing Instructions:');
        console.log('1. Refresh the React Native app');
        console.log('2. Look for the new SUCCEEDED job in the list');
        console.log(`3. Click on job: ${newJob.id}`);
        console.log('4. Scroll down to the "Artifacts" section');
        console.log('5. Verify 6 artifacts are displayed with icons:');
        console.log('   🎹 MIDI File (guitar)');
        console.log('   🎼 MusicXML Score (guitar)');
        console.log('   📄 PDF Score (guitar)');
        console.log('   🎹 MIDI File (drums)');
        console.log('   📄 PDF Score (drums)');
        console.log('   🎵 Audio Preview');
        console.log('6. Click on any artifact to test download');
        console.log('7. Verify browser opens download URL');
        
        console.log('\n✅ Test job created successfully!');
        console.log('   You can now test T42 artifact list and download functionality');
        
    } catch (error) {
        console.error('❌ Failed to create test job:', error.message);
    }
}

if (require.main === module) {
    createTestSucceededJob();
}

module.exports = { createTestSucceededJob };
