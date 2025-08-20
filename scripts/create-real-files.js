#!/usr/bin/env node

/**
 * Create Real Files for zhiyang446@gmail.com artifacts
 * 
 * This script will create actual downloadable files in Supabase Storage
 * for the test artifacts we created for T42 testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createRealFiles() {
    console.log('🏗️ Creating Real Files for T42 Testing');
    console.log('=======================================');
    
    try {
        // Step 1: Find artifacts for zhiyang446@gmail.com
        console.log('Step 1: Finding artifacts for zhiyang446@gmail.com...');
        
        // Get user ID first
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
        console.log(`✅ Found user: ${targetUser.email} (${userId.slice(-8)})`);
        
        // Get artifacts for this user's SUCCEEDED jobs
        const { data: artifacts, error: artifactsError } = await supabase
            .from('artifacts')
            .select(`
                *,
                jobs!inner(user_id, status)
            `)
            .eq('jobs.user_id', userId)
            .eq('jobs.status', 'SUCCEEDED');
            
        if (artifactsError) {
            console.error('❌ Failed to query artifacts:', artifactsError.message);
            return;
        }
        
        if (!artifacts || artifacts.length === 0) {
            console.log('❌ No artifacts found for this user');
            return;
        }
        
        console.log(`✅ Found ${artifacts.length} artifacts to process`);
        
        // Step 2: Create files for each artifact
        console.log('\nStep 2: Creating real files...');
        
        for (const artifact of artifacts) {
            await createFileForArtifact(artifact);
        }
        
        console.log('\n🎉 All files created successfully!');
        console.log('   Now you can test the download functionality in the app');
        
    } catch (error) {
        console.error('❌ Failed to create files:', error.message);
    }
}

async function createFileForArtifact(artifact) {
    console.log(`\n📦 Processing: ${artifact.kind} (${artifact.instrument || 'general'})`);
    console.log(`   Storage Path: ${artifact.storage_path}`);
    
    // Create content based on artifact type
    let content;
    let contentType;
    let fileName;
    
    switch (artifact.kind) {
        case 'midi':
            content = createMIDIContent(artifact.instrument);
            contentType = 'audio/midi';
            fileName = `${artifact.instrument || 'track'}.mid`;
            break;
            
        case 'musicxml':
            content = createMusicXMLContent(artifact.instrument);
            contentType = 'application/xml';
            fileName = `${artifact.instrument || 'track'}.musicxml`;
            break;
            
        case 'pdf':
            content = createPDFContent(artifact.instrument);
            contentType = 'application/pdf';
            fileName = `${artifact.instrument || 'track'}.pdf`;
            break;
            
        case 'preview':
            content = createAudioContent();
            contentType = 'audio/mpeg';
            fileName = 'preview.mp3';
            break;
            
        default:
            content = Buffer.from(`Test ${artifact.kind} file for ${artifact.instrument || 'general'}\nCreated for T42 testing`);
            contentType = 'text/plain';
            fileName = `${artifact.kind}.txt`;
    }
    
    try {
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('audio-input')
            .upload(artifact.storage_path, content, {
                contentType: contentType,
                upsert: true
            });
            
        if (uploadError) {
            console.log(`   ❌ Upload failed: ${uploadError.message}`);
        } else {
            console.log(`   ✅ Created ${fileName} (${content.length} bytes)`);
            
            // Test signed URL
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('audio-input')
                .createSignedUrl(artifact.storage_path, 3600);
                
            if (signedUrlError) {
                console.log(`   ⚠️  Signed URL test failed: ${signedUrlError.message}`);
            } else {
                console.log(`   ✅ Download URL ready`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

function createMIDIContent(instrument) {
    // Create a simple MIDI file with a few notes
    const header = Buffer.from([
        0x4D, 0x54, 0x68, 0x64, // "MThd"
        0x00, 0x00, 0x00, 0x06, // Header length
        0x00, 0x00, // Format type 0
        0x00, 0x01, // Number of tracks
        0x00, 0x60  // Ticks per quarter note
    ]);
    
    // Simple track with a few notes
    const track = Buffer.from([
        0x4D, 0x54, 0x72, 0x6B, // "MTrk"
        0x00, 0x00, 0x00, 0x1B, // Track length
        0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08, // Time signature
        0x00, 0x90, 0x3C, 0x40, // Note on C4
        0x60, 0x80, 0x3C, 0x40, // Note off C4
        0x00, 0x90, 0x40, 0x40, // Note on E4
        0x60, 0x80, 0x40, 0x40, // Note off E4
        0x00, 0xFF, 0x2F, 0x00  // End of track
    ]);
    
    return Buffer.concat([header, track]);
}

function createMusicXMLContent(instrument) {
    return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work>
    <work-title>T42 Test Score - ${instrument || 'Instrument'}</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>${instrument || 'Instrument'}</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>C</step>
          <octave>5</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`);
}

function createPDFContent(instrument) {
    // Create a simple PDF with text
    const content = `%PDF-1.4
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
/Contents 4 0 R
/Resources <<
  /Font <<
    /F1 5 0 R
  >>
>>
>>
endobj
4 0 obj
<<
/Length 120
>>
stream
BT
/F1 24 Tf
100 700 Td
(T42 Test Score) Tj
0 -50 Td
(Instrument: ${instrument || 'General'}) Tj
0 -50 Td
(Generated for testing) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000279 00000 n 
0000000449 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
527
%%EOF`;
    
    return Buffer.from(content);
}

function createAudioContent() {
    // Create a minimal MP3-like file
    const mp3Header = Buffer.from([
        0xFF, 0xFB, 0x90, 0x00, // MP3 header
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00
    ]);
    
    // Add some dummy audio data
    const audioData = Buffer.alloc(1000, 0x00);
    
    return Buffer.concat([mp3Header, audioData]);
}

if (require.main === module) {
    createRealFiles();
}

module.exports = { createRealFiles };
