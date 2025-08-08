#!/usr/bin/env node

// Simple audio transcription test script
const FormData = require('form-data');
const fs = require('fs');
const https = require('https');
const http = require('http');

async function testAudioUpload() {
  console.log('🎙️  Testing Indonesian Meeting Transcription API\n');

  // Check if server is running
  try {
    const response = await fetch('http://localhost:3001/api/health');
    const health = await response.json();
    console.log('✅ Server Status:', health.status);
    console.log('📊 Services:', health.services.map(s => `${s.name}: ${s.status}`).join(', '));
  } catch (error) {
    console.log('❌ Server not running. Please start with: npm run dev');
    console.log('   Or: cd backend && npm run dev\n');
    return;
  }

  // Create a simple test audio file (mock)
  const testAudioContent = Buffer.from([
    // Mock MP3 header bytes
    0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
    // Add some dummy audio data
    ...Array(1000).fill(0).map(() => Math.floor(Math.random() * 256))
  ]);

  const testAudioPath = './test-meeting.mp3';
  fs.writeFileSync(testAudioPath, testAudioContent);

  console.log('\n📤 Uploading test audio file...');

  try {
    const form = new FormData();
    form.append('audio', fs.createReadStream(testAudioPath), {
      filename: 'test-meeting.mp3',
      contentType: 'audio/mpeg'
    });
    form.append('title', 'Test Meeting - Indonesian Transcription');
    form.append('description', 'Testing audio transcription with Indonesian language');
    form.append('language', 'id');
    form.append('participants', JSON.stringify(['Budi Santoso', 'Siti Nurhaliza']));

    const response = await fetch('http://localhost:3001/api/meetings/upload', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Upload successful!');
      console.log('📋 Meeting ID:', result.meetingId);
      console.log('⏱️  Estimated processing time:', result.estimatedProcessingTime, 'seconds');
      console.log('📊 Status:', result.status);

      // Wait a moment for processing
      console.log('\n⏳ Waiting for transcription processing...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check transcription
      const transcriptionResponse = await fetch(`http://localhost:3001/api/meetings/${result.meetingId}/transcription`);
      const transcriptionResult = await transcriptionResponse.json();

      if (transcriptionResponse.ok && transcriptionResult.transcription) {
        console.log('\n🎯 Transcription Results:');
        console.log('📝 Language:', transcriptionResult.transcription.language);
        console.log('🎚️  Confidence:', (transcriptionResult.transcription.confidence * 100).toFixed(1) + '%');
        console.log('👥 Speakers:', transcriptionResult.transcription.speakers.length);
        console.log('\n📄 Sample Segments:');
        
        transcriptionResult.transcription.segments.slice(0, 3).forEach((segment, i) => {
          console.log(`${i + 1}. [${segment.speaker || 'Unknown'}] ${segment.text}`);
          console.log(`   Time: ${segment.startTime}s - ${segment.endTime}s (${(segment.confidence * 100).toFixed(1)}% confidence)`);
        });

        // Check summary
        console.log('\n⏳ Checking summary...');
        const summaryResponse = await fetch(`http://localhost:3001/api/meetings/${result.meetingId}/summary`);
        const summaryResult = await summaryResponse.json();

        if (summaryResponse.ok && summaryResult.summary) {
          console.log('\n📋 Meeting Summary:');
          console.log('🏷️  Title:', summaryResult.summary.title);
          console.log('📝 Summary:', summaryResult.summary.summary.substring(0, 200) + '...');
          console.log('🔑 Key Points:', summaryResult.summary.keyPoints.length);
          console.log('✅ Action Items:', summaryResult.summary.actionItems.length);
          console.log('📊 Topics:', summaryResult.summary.topics.length);
          console.log('😊 Sentiment:', summaryResult.summary.sentiment.overall);
        } else {
          console.log('⏳ Summary still processing or unavailable');
        }

      } else {
        console.log('⏳ Transcription still processing');
        console.log('💡 Try checking again in a few seconds with:');
        console.log(`   curl http://localhost:3001/api/meetings/${result.meetingId}/transcription`);
      }

      console.log('\n🌐 API Endpoints for testing:');
      console.log(`📋 Meeting Details: http://localhost:3001/api/meetings/${result.meetingId}`);
      console.log(`🎙️  Transcription: http://localhost:3001/api/meetings/${result.meetingId}/transcription`);
      console.log(`📊 Summary: http://localhost:3001/api/meetings/${result.meetingId}/summary`);
      console.log(`📚 API Docs: http://localhost:3001/api/docs`);

    } else {
      console.log('❌ Upload failed:', result.message || result.error);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  } finally {
    // Cleanup
    if (fs.existsSync(testAudioPath)) {
      fs.unlinkSync(testAudioPath);
    }
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ with built-in fetch');
  console.log('💡 Alternative: Use curl commands from the API docs');
  process.exit(1);
}

testAudioUpload().catch(console.error);