#!/usr/bin/env node

/**
 * Create Test Audio File
 * Generates a simple test audio file for upload testing
 */

const fs = require('fs');
const path = require('path');

function createTestAudioFile() {
  console.log('🎵 Creating test audio file...\n');
  
  // Create a simple WAV file header (44 bytes)
  // This creates a minimal valid WAV file that can be used for testing
  const sampleRate = 44100;
  const duration = 1; // 1 second
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize;
  
  const buffer = Buffer.alloc(fileSize);
  let offset = 0;
  
  // WAV header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;
  
  // Format chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // Chunk size
  buffer.writeUInt16LE(1, offset); offset += 2; // Audio format (PCM)
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), offset); offset += 4; // Byte rate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), offset); offset += 2; // Block align
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
  
  // Data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;
  
  // Generate simple sine wave data
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate); // 440 Hz tone
    const value = Math.round(sample * 32767); // Convert to 16-bit
    buffer.writeInt16LE(value, offset);
    offset += 2;
  }
  
  // Save the file
  const testDir = path.join(process.cwd(), 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, 'test-audio.wav');
  fs.writeFileSync(filePath, buffer);
  
  console.log('✅ Test audio file created successfully');
  console.log('   File path:', filePath);
  console.log('   File size:', buffer.length, 'bytes');
  console.log('   Duration:', duration, 'second(s)');
  console.log('   Sample rate:', sampleRate, 'Hz');
  console.log('   Format: WAV (PCM)');
  
  return filePath;
}

// Also create a fake MP3 file for testing different formats
function createTestMP3File() {
  console.log('\n🎵 Creating test MP3 file...\n');
  
  // Create a minimal MP3-like file (not a real MP3, but has correct extension and some data)
  const testDir = path.join(process.cwd(), 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create a small binary file that mimics an MP3
  const mp3Header = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, // MP3 frame header
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
  
  // Add some random data to make it a reasonable size
  const dataSize = 1024; // 1KB
  const randomData = Buffer.alloc(dataSize);
  for (let i = 0; i < dataSize; i++) {
    randomData[i] = Math.floor(Math.random() * 256);
  }
  
  const mp3Buffer = Buffer.concat([mp3Header, randomData]);
  const mp3Path = path.join(testDir, 'test-audio.mp3');
  fs.writeFileSync(mp3Path, mp3Buffer);
  
  console.log('✅ Test MP3 file created successfully');
  console.log('   File path:', mp3Path);
  console.log('   File size:', mp3Buffer.length, 'bytes');
  console.log('   Format: MP3 (simulated)');
  
  return mp3Path;
}

if (require.main === module) {
  try {
    const wavPath = createTestAudioFile();
    const mp3Path = createTestMP3File();
    
    console.log('\n🎉 Test audio files ready for upload testing!');
    console.log('📁 Test files directory:', path.join(process.cwd(), 'test-files'));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create test audio files:', error.message);
    process.exit(1);
  }
}

module.exports = { createTestAudioFile, createTestMP3File };
