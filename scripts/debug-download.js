#!/usr/bin/env node

/**
 * Debug Download Function
 * 
 * This script will:
 * 1. Test the signed URL API endpoint
 * 2. Check if storage files exist
 * 3. Create actual test files in storage if needed
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORCHESTRATOR_URL = 'http://localhost:8000';

async function debugDownload() {
    console.log('🔍 Debug Download Function');
    console.log('===========================');
    
    try {
        // Step 1: Find the test artifacts
        console.log('Step 1: Finding test artifacts...');
        
        const { data: artifacts, error: artifactsError } = await supabase
            .from('artifacts')
            .select(`
                *,
                jobs!inner(user_id, status)
            `)
            .eq('jobs.status', 'SUCCEEDED')
            .limit(5);
            
        if (artifactsError) {
            console.error('❌ Failed to query artifacts:', artifactsError.message);
            return;
        }
        
        if (!artifacts || artifacts.length === 0) {
            console.log('❌ No artifacts found');
            return;
        }
        
        console.log(`✅ Found ${artifacts.length} artifacts`);
        
        // Step 2: Test each artifact's storage path
        console.log('\nStep 2: Testing storage paths...');
        
        for (const artifact of artifacts.slice(0, 3)) { // Test first 3
            console.log(`\n📦 Testing artifact: ${artifact.id.slice(-8)}`);
            console.log(`   Kind: ${artifact.kind}`);
            console.log(`   Storage Path: ${artifact.storage_path}`);
            
            // Check if file exists in storage
            try {
                const { data: fileData, error: fileError } = await supabase.storage
                    .from('audio-input')
                    .download(artifact.storage_path);
                    
                if (fileError) {
                    console.log(`   ❌ File doesn't exist: ${fileError.message}`);
                    
                    // Create a test file
                    await createTestFile(artifact);
                } else {
                    console.log(`   ✅ File exists in storage`);
                }
                
                // Test signed URL creation
                await testSignedURL(artifact);
                
            } catch (error) {
                console.log(`   ❌ Storage error: ${error.message}`);
            }
        }
        
        console.log('\n✅ Download debug complete!');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

async function createTestFile(artifact) {
    console.log(`   🏗️ Creating test file for ${artifact.kind}...`);
    
    // Create different content based on artifact type
    let content;
    let contentType;
    
    switch (artifact.kind) {
        case 'midi':
            // Simple MIDI file header
            content = Buffer.from([
                0x4D, 0x54, 0x68, 0x64, // "MThd"
                0x00, 0x00, 0x00, 0x06, // Header length
                0x00, 0x00, // Format type 0
                0x00, 0x01, // Number of tracks
                0x00, 0x60  // Ticks per quarter note
            ]);
            contentType = 'audio/midi';
            break;
            
        case 'musicxml':
            content = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>${artifact.instrument || 'Instrument'}</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`);
            contentType = 'application/xml';
            break;
            
        case 'pdf':
            // Simple PDF header
            content = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
209
%%EOF`);
            contentType = 'application/pdf';
            break;
            
        case 'preview':
            // Simple audio file header (MP3-like)
            content = Buffer.from([
                0xFF, 0xFB, 0x90, 0x00, // MP3 header
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00
            ]);
            contentType = 'audio/mpeg';
            break;
            
        default:
            content = Buffer.from(`Test ${artifact.kind} file for ${artifact.instrument || 'general'}`);
            contentType = 'text/plain';
    }
    
    try {
        const { error: uploadError } = await supabase.storage
            .from('audio-input')
            .upload(artifact.storage_path, content, {
                contentType: contentType,
                upsert: true
            });
            
        if (uploadError) {
            console.log(`   ❌ Failed to create file: ${uploadError.message}`);
        } else {
            console.log(`   ✅ Created test file (${content.length} bytes)`);
        }
    } catch (error) {
        console.log(`   ❌ Upload error: ${error.message}`);
    }
}

async function testSignedURL(artifact) {
    console.log(`   🔗 Testing signed URL creation...`);
    
    try {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('audio-input')
            .createSignedUrl(artifact.storage_path, 3600);
            
        if (signedUrlError) {
            console.log(`   ❌ Signed URL error: ${signedUrlError.message}`);
        } else {
            console.log(`   ✅ Signed URL created: ${signedUrlData.signedUrl.slice(0, 50)}...`);
            
            // Test if URL is accessible
            try {
                const response = await fetch(signedUrlData.signedUrl, { method: 'HEAD' });
                console.log(`   📡 URL test: ${response.status} ${response.statusText}`);
            } catch (fetchError) {
                console.log(`   ❌ URL fetch error: ${fetchError.message}`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Signed URL creation error: ${error.message}`);
    }
}

if (require.main === module) {
    debugDownload();
}

module.exports = { debugDownload };
