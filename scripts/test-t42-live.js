#!/usr/bin/env node

/**
 * T42 Live Test Script
 * 
 * Quick test to verify we have test data available for T42 testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testT42Live() {
    console.log('🔍 T42 Live Test - Checking Test Data');
    console.log('====================================');
    
    try {
        // Step 1: Check for SUCCEEDED jobs with artifacts
        console.log('Step 1: Checking for test data...');
        
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('id, status, progress, created_at')
            .eq('status', 'SUCCEEDED')
            .order('created_at', { ascending: false })
            .limit(3);
            
        if (jobsError) {
            console.error('❌ Failed to query jobs:', jobsError.message);
            return;
        }
        
        if (!jobs || jobs.length === 0) {
            console.log('❌ No SUCCEEDED jobs found');
            console.log('   Creating a test job with artifacts...');
            
            // Create a test job with artifacts
            await createTestJobWithArtifacts();
            return;
        }
        
        console.log(`✅ Found ${jobs.length} SUCCEEDED job(s)`);
        
        // Step 2: Check for artifacts
        let jobWithArtifacts = null;
        
        for (const job of jobs) {
            const { data: artifacts, error: artifactsError } = await supabase
                .from('artifacts')
                .select('*')
                .eq('job_id', job.id);
                
            if (!artifactsError && artifacts && artifacts.length > 0) {
                jobWithArtifacts = job;
                console.log(`✅ Job ${job.id} has ${artifacts.length} artifact(s)`);
                
                artifacts.forEach((artifact, index) => {
                    console.log(`   ${index + 1}. ${artifact.kind} (${artifact.instrument || 'N/A'})`);
                });
                break;
            }
        }
        
        if (!jobWithArtifacts) {
            console.log('❌ No jobs with artifacts found');
            console.log('   Creating test artifacts...');
            await createTestArtifacts(jobs[0].id);
            jobWithArtifacts = jobs[0];
        }
        
        // Step 3: Provide testing instructions
        console.log('\n🎯 T42 Testing Instructions:');
        console.log('============================');
        console.log('1. Open the React Native app in your browser');
        console.log('2. Sign in with your Supabase account');
        console.log('3. Navigate to the Jobs list');
        console.log(`4. Click on job: ${jobWithArtifacts.id}`);
        console.log('5. Scroll down to the "Artifacts" section');
        console.log('6. Verify artifacts are displayed with icons');
        console.log('7. Click on an artifact to test download');
        console.log('8. Verify the browser opens a download URL');
        
        console.log('\n📱 App URLs:');
        console.log('   React Native: http://localhost:8083');
        console.log('   API Docs: http://localhost:8000/docs');
        
        console.log('\n✅ T42 Live Test Setup Complete!');
        
    } catch (error) {
        console.error('❌ T42 live test failed:', error.message);
    }
}

async function createTestArtifacts(jobId) {
    console.log(`📦 Creating test artifacts for job ${jobId}...`);
    
    const testArtifacts = [
        {
            job_id: jobId,
            kind: 'midi',
            instrument: 'guitar',
            storage_path: `outputs/${jobId}/guitar.mid`,
            bytes: 1024
        },
        {
            job_id: jobId,
            kind: 'musicxml',
            instrument: 'guitar',
            storage_path: `outputs/${jobId}/guitar.musicxml`,
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
    
    for (const artifact of testArtifacts) {
        const { error } = await supabase
            .from('artifacts')
            .insert(artifact);
            
        if (error) {
            console.error(`❌ Failed to create ${artifact.kind} artifact:`, error.message);
        } else {
            console.log(`✅ Created ${artifact.kind} artifact`);
        }
    }
}

async function createTestJobWithArtifacts() {
    console.log('🏗️ Creating test job with artifacts...');
    
    // This would require more complex setup
    // For now, just provide instructions
    console.log('❌ No test data available');
    console.log('   Please run a transcription job first or use existing SUCCEEDED jobs');
}

if (require.main === module) {
    testT42Live();
}

module.exports = { testT42Live };
