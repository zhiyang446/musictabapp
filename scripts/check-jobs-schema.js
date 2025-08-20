#!/usr/bin/env node

/**
 * Check Jobs Table Schema
 * 
 * This script checks the current structure of the jobs table
 * to understand what fields exist before adding youtube_url
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkJobsSchema() {
    console.log('🔍 Checking Jobs Table Schema');
    console.log('==============================');
    
    try {
        // Check a sample job to see the actual data structure
        console.log('📋 Checking jobs table structure via sample data...');

        const { data: sampleJobs, error: jobsError } = await supabase
            .from('jobs')
            .select('*')
            .limit(1);

        if (jobsError) {
            console.error('❌ Failed to query sample jobs:', jobsError.message);
            return;
        }

        if (sampleJobs && sampleJobs.length > 0) {
            const sampleJob = sampleJobs[0];
            console.log('📋 Current jobs table fields:');
            console.log('=============================');

            Object.keys(sampleJob).forEach((key, index) => {
                console.log(`${index + 1}. ${key}: ${typeof sampleJob[key]}`);
            });

            // Check if youtube_url already exists
            const youtubeUrlExists = sampleJob.hasOwnProperty('youtube_url');

            if (youtubeUrlExists) {
                console.log('\n✅ youtube_url field already exists!');
                console.log(`   Value: ${sampleJob.youtube_url}`);
            } else {
                console.log('\n❌ youtube_url field does not exist - needs to be added');
            }
        } else {
            console.log('❌ No jobs found in the table to check structure');
        }

        // Show sample job data for reference
        if (sampleJobs && sampleJobs.length > 0) {
            const sampleJob = sampleJobs[0];
            console.log('\n📊 Sample job data:');
            console.log('===================');
            console.log(`ID: ${sampleJob.id}`);
            console.log(`Source Type: ${sampleJob.source_type}`);
            console.log(`Source Object Path: ${sampleJob.source_object_path}`);
            console.log(`Status: ${sampleJob.status}`);
            console.log(`Instruments: ${JSON.stringify(sampleJob.instruments)}`);
            if (sampleJob.youtube_url) {
                console.log(`YouTube URL: ${sampleJob.youtube_url}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Schema check failed:', error.message);
    }
}

if (require.main === module) {
    checkJobsSchema();
}

module.exports = { checkJobsSchema };
