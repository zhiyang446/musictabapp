#!/usr/bin/env node

/**
 * Job Status Query Script
 * 
 * Query and display job statuses from the database
 * Usage: node scripts/query-jobs.js [job_id] [--limit=10] [--status=PENDING]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function queryJobs() {
    console.log('📋 Job Status Query');
    console.log('===================');
    
    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        const jobId = args.find(arg => !arg.startsWith('--'));
        const limitArg = args.find(arg => arg.startsWith('--limit='));
        const statusArg = args.find(arg => arg.startsWith('--status='));
        
        const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;
        const statusFilter = statusArg ? statusArg.split('=')[1] : null;
        
        let query = supabase.from('jobs').select('*');
        
        if (jobId) {
            // Query specific job
            console.log(`🔍 Querying specific job: ${jobId}`);
            query = query.eq('id', jobId);
        } else {
            // Query multiple jobs
            console.log(`🔍 Querying recent jobs (limit: ${limit})`);
            if (statusFilter) {
                console.log(`   Status filter: ${statusFilter}`);
                query = query.eq('status', statusFilter);
            }
            query = query.order('created_at', { ascending: false }).limit(limit);
        }
        
        const { data: jobs, error } = await query;
        
        if (error) {
            console.error('❌ Query failed:', error.message);
            return;
        }
        
        if (!jobs || jobs.length === 0) {
            console.log('📭 No jobs found');
            return;
        }
        
        console.log(`\n📊 Found ${jobs.length} job(s):`);
        console.log(''.padEnd(80, '='));
        
        jobs.forEach((job, index) => {
            const statusIcon = getStatusIcon(job.status);
            const progressBar = getProgressBar(job.progress || 0);
            
            console.log(`\n${index + 1}. Job ${job.id}`);
            console.log(`   Status: ${statusIcon} ${job.status}`);
            console.log(`   Progress: ${progressBar} ${job.progress || 0}%`);
            console.log(`   User: ${job.user_id}`);
            console.log(`   Created: ${new Date(job.created_at).toLocaleString()}`);
            console.log(`   Updated: ${new Date(job.updated_at).toLocaleString()}`);
            
            if (job.youtube_url) {
                console.log(`   YouTube: ${job.youtube_url}`);
            }
            
            if (job.error) {
                console.log(`   Error: ${job.error}`);
            }
        });
        
        // Summary statistics
        console.log('\n📈 Status Summary:');
        const statusCounts = jobs.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
        }, {});
        
        Object.entries(statusCounts).forEach(([status, count]) => {
            const icon = getStatusIcon(status);
            console.log(`   ${icon} ${status}: ${count}`);
        });
        
    } catch (error) {
        console.error('❌ Query failed:', error.message);
    }
}

function getStatusIcon(status) {
    const icons = {
        'PENDING': '⏳',
        'QUEUED': '📋',
        'RUNNING': '🔄',
        'SUCCEEDED': '✅',
        'COMPLETED': '✅',
        'FAILED': '❌',
        'CANCELLED': '🚫'
    };
    return icons[status] || '❓';
}

function getProgressBar(progress) {
    const width = 20;
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

function printUsage() {
    console.log('Usage: node scripts/query-jobs.js [job_id] [options]');
    console.log('');
    console.log('Options:');
    console.log('  --limit=N     Limit number of results (default: 10)');
    console.log('  --status=S    Filter by status (PENDING, RUNNING, SUCCEEDED, etc.)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/query-jobs.js                           # Recent 10 jobs');
    console.log('  node scripts/query-jobs.js --limit=5                 # Recent 5 jobs');
    console.log('  node scripts/query-jobs.js --status=SUCCEEDED        # All succeeded jobs');
    console.log('  node scripts/query-jobs.js fa1fb2fa-34dd-4fe0-b718-52b488a45769  # Specific job');
}

if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        printUsage();
    } else {
        queryJobs();
    }
}

module.exports = { queryJobs };
