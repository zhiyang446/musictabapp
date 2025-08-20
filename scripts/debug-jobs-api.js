#!/usr/bin/env node

/**
 * Debug Jobs API - Check why SUCCEEDED jobs don't appear in MyJobs
 * 
 * This script will:
 * 1. Check Supabase data directly
 * 2. Test the Orchestrator API
 * 3. Compare results to find the issue
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORCHESTRATOR_URL = 'http://localhost:8000';

async function debugJobsAPI() {
    console.log('🔍 Debug Jobs API - Finding Missing SUCCEEDED Jobs');
    console.log('==================================================');
    
    try {
        // Step 1: Check Supabase data directly
        console.log('Step 1: Checking Supabase data directly...');
        
        const { data: allJobs, error: allJobsError } = await supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (allJobsError) {
            console.error('❌ Failed to query Supabase:', allJobsError.message);
            return;
        }
        
        console.log(`✅ Found ${allJobs.length} jobs in Supabase:`);
        allJobs.forEach((job, index) => {
            console.log(`   ${index + 1}. ${job.id.slice(-8)} - ${job.status} (${job.progress}%) - User: ${job.user_id.slice(-8)}`);
        });
        
        // Step 2: Check for SUCCEEDED jobs specifically
        const succeededJobs = allJobs.filter(job => job.status === 'SUCCEEDED');
        console.log(`\n📊 SUCCEEDED jobs: ${succeededJobs.length}`);
        
        if (succeededJobs.length === 0) {
            console.log('❌ No SUCCEEDED jobs found in Supabase');
            return;
        }
        
        // Step 3: Get user ID from existing jobs for API testing
        const testUserId = allJobs[0].user_id;
        console.log(`\n🔑 Using user ID for API test: ${testUserId.slice(-8)}...`);
        
        // Step 4: Create a test JWT token (we'll simulate this)
        console.log('\nStep 4: Testing Orchestrator API...');
        console.log('⚠️  Note: We need a valid JWT token to test the API');
        console.log('   The React Native app should have this token from authentication');
        
        // Step 5: Check if there are user-specific issues
        console.log('\nStep 5: Analyzing user-specific data...');
        
        const userJobs = allJobs.filter(job => job.user_id === testUserId);
        console.log(`📋 Jobs for user ${testUserId.slice(-8)}: ${userJobs.length}`);
        
        userJobs.forEach((job, index) => {
            console.log(`   ${index + 1}. ${job.id.slice(-8)} - ${job.status} (${job.progress}%)`);
        });
        
        const userSucceededJobs = userJobs.filter(job => job.status === 'SUCCEEDED');
        console.log(`✅ SUCCEEDED jobs for this user: ${userSucceededJobs.length}`);
        
        // Step 6: Check RLS policies
        console.log('\nStep 6: Checking potential RLS issues...');
        console.log('   RLS (Row Level Security) might be filtering results');
        console.log('   The API uses JWT authentication which should match user_id');
        
        // Step 7: Provide debugging recommendations
        console.log('\n🔧 Debugging Recommendations:');
        console.log('===============================');
        
        if (userSucceededJobs.length > 0) {
            console.log('✅ SUCCEEDED jobs exist for the user');
            console.log('   Issue might be:');
            console.log('   1. JWT token authentication in React Native app');
            console.log('   2. API endpoint filtering or pagination');
            console.log('   3. React Native app state management');
            console.log('   4. Browser console errors');
        } else {
            console.log('❌ No SUCCEEDED jobs for the current user');
            console.log('   The test job might belong to a different user');
            console.log('   Check user_id in the created test job');
        }
        
        // Step 8: Browser debugging instructions
        console.log('\n🌐 Browser Debugging Instructions:');
        console.log('===================================');
        console.log('1. Open React Native app in browser');
        console.log('2. Open Developer Tools (F12)');
        console.log('3. Go to Console tab');
        console.log('4. Refresh the MyJobs page');
        console.log('5. Look for these log messages:');
        console.log('   - "📋 T40: Fetching jobs list..."');
        console.log('   - "📋 T40: Jobs list response status: 200"');
        console.log('   - "✅ T40: Jobs fetched: {data}"');
        console.log('6. Check Network tab for API calls to /jobs');
        console.log('7. Verify the response contains SUCCEEDED jobs');
        
        // Step 9: Quick API test simulation
        console.log('\n🧪 API Test Simulation:');
        console.log('========================');
        console.log(`GET ${ORCHESTRATOR_URL}/jobs?limit=10`);
        console.log('Headers: Authorization: Bearer <JWT_TOKEN>');
        console.log('Expected response should include SUCCEEDED jobs');
        
        console.log('\n✅ Debug analysis complete!');
        console.log('   Check browser console and network tab for more details');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

if (require.main === module) {
    debugJobsAPI();
}

module.exports = { debugJobsAPI };
