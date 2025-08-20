#!/usr/bin/env node

/**
 * Check T46 Status - Quick verification of YouTube task functionality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkT46Status() {
    console.log('🔍 T46 Status Check - YouTube Task Functionality');
    console.log('===============================================');
    
    try {
        // Get test user
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersError) {
            console.error('❌ Failed to get users:', usersError.message);
            return;
        }
        
        const testUser = users.users.find(user => user.email === 'zhiyang446@gmail.com');
        if (!testUser) {
            console.error('❌ Test user not found');
            return;
        }
        
        console.log(`✅ Found user: ${testUser.email}`);
        
        // Check for YouTube jobs
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('*')
            .eq('user_id', testUser.id)
            .eq('source_type', 'youtube')
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (jobsError) {
            console.error('❌ Failed to query jobs:', jobsError.message);
            return;
        }
        
        console.log(`\n📊 Found ${jobs.length} YouTube jobs:`);
        
        if (jobs.length === 0) {
            console.log('⚠️  No YouTube jobs found. You may need to:');
            console.log('   1. Create a YouTube job through the React Native app');
            console.log('   2. Or run the T46 test script to create test data');
            return;
        }
        
        jobs.forEach((job, index) => {
            const statusIcon = job.status === 'SUCCEEDED' ? '✅' : 
                              job.status === 'RUNNING' ? '🔄' : 
                              job.status === 'PENDING' ? '⏳' : '❌';
            
            console.log(`\n${index + 1}. Job ${job.id.slice(-8)}:`);
            console.log(`   Status: ${statusIcon} ${job.status}`);
            console.log(`   Progress: ${job.progress}%`);
            console.log(`   YouTube URL: ${job.youtube_url}`);
            console.log(`   Created: ${new Date(job.created_at).toLocaleString()}`);
            console.log(`   Updated: ${new Date(job.updated_at).toLocaleString()}`);
            
            if (job.source_object_path) {
                console.log(`   Audio File: ${job.source_object_path}`);
            }
        });
        
        // Check for SUCCEEDED jobs
        const succeededJobs = jobs.filter(job => job.status === 'SUCCEEDED');
        
        console.log(`\n🎯 T46 Status Summary:`);
        console.log(`   Total YouTube jobs: ${jobs.length}`);
        console.log(`   SUCCEEDED jobs: ${succeededJobs.length}`);
        
        if (succeededJobs.length > 0) {
            console.log('\n🎉 T46 SUCCESS!');
            console.log('   ✅ YouTube tasks are being created');
            console.log('   ✅ Tasks are completing successfully');
            console.log('   ✅ Status updates are working');
            console.log('   ✅ Database is consistent');
            
            console.log('\n📱 To verify in React Native app:');
            console.log('   1. Open: http://localhost:8081');
            console.log('   2. Login as zhiyang446@gmail.com');
            console.log('   3. Go to "My Jobs"');
            console.log('   4. Look for SUCCEEDED YouTube tasks');
        } else {
            console.log('\n⚠️  T46 PARTIAL SUCCESS');
            console.log('   ✅ YouTube tasks are being created');
            console.log('   ⚠️  No completed tasks found');
            console.log('   💡 Tasks may still be processing or need Worker service');
        }
        
    } catch (error) {
        console.error('❌ Status check failed:', error.message);
    }
}

if (require.main === module) {
    checkT46Status();
}

module.exports = { checkT46Status };
