const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: [
      {
        name: 'OpenAI Service',
        status: process.env.OPENAI_API_KEY ? 'up' : 'missing_key'
      },
      {
        name: 'Summarization Service',
        status: 'up'
      }
    ],
    uptime: process.uptime()
  });
});

// OpenAI-powered summarization endpoint
app.post('/api/meetings/summarize', async (req, res) => {
  try {
    console.log('\n🚀 === BACKEND DEBUG: OpenAI Summarization Request ===');
    console.log('📥 Received summarization request from frontend');
    console.log('📊 Request body keys:', Object.keys(req.body));
    
    const { transcription, language = 'id' } = req.body;

    if (!transcription || !transcription.segments || transcription.segments.length === 0) {
      console.error('❌ Invalid transcription data received');
      return res.status(400).json({
        error: 'INVALID_TRANSCRIPTION',
        message: 'No transcription segments provided',
        statusCode: 400
      });
    }

    console.log('✅ Transcription data validated:');
    console.log('   - Segments count:', transcription.segments.length);
    console.log('   - Language:', language);
    console.log('   - Sample segments:', transcription.segments.slice(0, 2).map(s => `[${s.speakerId}] ${s.content?.substring(0, 40)}...`));

    // Convert segments to text format
    const transcriptionText = transcription.segments
      .map(segment => `[${segment.speakerId || 'Speaker'}] ${segment.content || ''}`)
      .join('\n');

    console.log('🤖 === CALLING OPENAI API ===');
    console.log('📝 Transcription text length:', transcriptionText.length, 'characters');
    console.log('📝 Transcription preview:', transcriptionText.substring(0, 200) + '...');
    console.log('🔑 OpenAI model:', process.env.GPT_MODEL || 'gpt-4o');
    console.log('🎛️ Temperature:', process.env.GPT_TEMPERATURE || 0.7);
    console.log('📏 Max tokens:', process.env.GPT_MAX_TOKENS || 4000);
    
    // Enhanced prompt for concise summarization IN INDONESIAN
    const userPrompt = `Buatkan ringkasan singkat dan padat untuk percakapan berikut:

${transcriptionText}

Analisis percakapan ini dan berikan ringkasan yang RINGKAS, PADAT, dan dapat ditindaklanjuti dalam BAHASA INDONESIA. Prioritaskan informasi paling penting dan praktis. Hindari kalimat yang terlalu panjang.

PANDUAN RINGKASAN:
- ExecutiveSummary: Maksimal 2 kalimat pendek
- KeyPoints: Maksimal 4 poin, masing-masing 1 kalimat pendek
- ActionItems: Hanya yang benar-benar penting dan spesifik
- Decisions: Hanya keputusan konkret yang dibuat

Respond with JSON in this format using INDONESIAN LANGUAGE:
{
  "executiveSummary": "Ringkasan singkat dalam 1-2 kalimat tentang inti meeting ini",
  "keyPoints": [
    "Poin penting pertama (singkat)",
    "Poin penting kedua (singkat)",
    "Poin penting ketiga (singkat)"
  ],
  "actionItems": [
    {
      "description": "Tugas konkret yang harus dilakukan",
      "assignee": "Penanggung jawab jika disebutkan",
      "priority": "medium"
    }
  ],
  "decisions": []
}`;

    // Call OpenAI GPT-4 (try with json_object format first, fallback if not supported)
    let response;
    try {
      response = await openai.chat.completions.create({
        model: process.env.GPT_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional meeting analyst. Extract real information from transcripts and create detailed, specific summaries in Indonesian language. Always respond with valid JSON format only. Respond in Indonesian (Bahasa Indonesia).'
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: parseInt(process.env.GPT_MAX_TOKENS) || 3000,
        temperature: parseFloat(process.env.GPT_TEMPERATURE) || 0.3,
        response_format: { type: 'json_object' }
      });
    } catch (jsonError) {
      console.log('⚠️ JSON format not supported, trying regular format...');
      // Fallback without json_object format
      response = await openai.chat.completions.create({
        model: process.env.GPT_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional meeting analyst. Extract real information from transcripts and create detailed, specific summaries in Indonesian language. Always respond with valid JSON format only. Respond in Indonesian (Bahasa Indonesia).'
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: parseInt(process.env.GPT_MAX_TOKENS) || 3000,
        temperature: parseFloat(process.env.GPT_TEMPERATURE) || 0.3
      });
    }

    // Parse OpenAI response with error handling
    let summaryData = {};
    try {
      const rawContent = response.choices[0]?.message?.content || '{}';
      console.log('📄 Raw OpenAI response preview:', rawContent.substring(0, 200) + '...');
      
      // Clean up response if it contains markdown code blocks
      const cleanedContent = rawContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      summaryData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message);
      console.log('📝 Raw content causing error:', response.choices[0]?.message?.content);
      
      // Fallback with basic structure
      summaryData = {
        executiveSummary: "Meeting telah berlangsung dengan baik namun terjadi error dalam parsing detail summary.",
        keyPoints: ["Error dalam memproses detail meeting", "Silakan coba lagi atau hubungi support"],
        actionItems: [],
        decisions: []
      };
    }
    
    // Format response to match frontend expectations
    const meetingSummary = {
      id: Date.now().toString(),
      meetingId: 'live-recording-' + Date.now(),
      executiveSummary: summaryData.executiveSummary || 'Ringkasan meeting tidak tersedia',
      keyPoints: summaryData.keyPoints || [],
      actionItems: (summaryData.actionItems || []).map((item, index) => ({
        id: (index + 1).toString(),
        description: item.description || '',
        assignee: item.assignee || undefined,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        priority: item.priority || 'medium',
        status: 'pending'
      })),
      decisions: (summaryData.decisions || []).map((decision, index) => ({
        id: (index + 1).toString(),
        description: decision.description || '',
        context: 'Keputusan dari meeting',
        impact: 'Mempengaruhi tindak lanjut meeting',
        decidedBy: decision.decidedBy || 'Tim'
      })),
      generatedAt: new Date()
    };

    console.log('🎯 === OPENAI API RESPONSE RECEIVED ===');
    console.log('✅ Successfully generated OpenAI summary with:');
    console.log(`   - ${meetingSummary.keyPoints.length} key points`);
    console.log(`   - ${meetingSummary.actionItems.length} action items`);
    console.log(`   - ${meetingSummary.decisions.length} decisions`);
    console.log(`   - ${meetingSummary.executiveSummary.length} character executive summary`);
    console.log('📝 Sample key point:', meetingSummary.keyPoints[0]?.substring(0, 60) + '...');
    console.log('🚀 === SENDING RESPONSE TO FRONTEND ===');

    res.json(meetingSummary);

  } catch (error) {
    console.error('❌ OpenAI Summarization failed:', error);
    res.status(500).json({
      error: 'SUMMARIZATION_FAILED',
      message: error.message || 'Failed to generate summary with OpenAI',
      statusCode: 500
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 OpenAI-Powered Meeting Transcription Backend`);
  console.log(`📡 Server running on port ${port}`);
  console.log(`🌐 Health check: http://localhost:${port}/api/health`);
  const apiKeyStatus = process.env.OPENAI_API_KEY ? '✅ Ready' : '❌ Missing';
  console.log(`🔑 OpenAI API Key: ${apiKeyStatus}`);
  console.log(`🎯 Ready to process summarization requests!`);
  console.log(`---`);
});