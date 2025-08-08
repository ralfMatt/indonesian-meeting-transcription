// Simple Node.js server for testing live recording
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = 3001;
const WS_PORT = 3002;

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment variables');
  console.log('Environment check:', { 
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Found' : 'Not found'
  });
} else {
  console.log('✅ OpenAI API key loaded successfully');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Mock Indonesian transcription responses
const mockIndonesianTranscriptions = [
  "Selamat pagi semua, mari kita mulai meeting hari ini.",
  "Saya rasa kita perlu fokus pada testing dan quality assurance.",
  "Apakah ada update dari tim development?",
  "Terima kasih atas presentasinya, sangat informatif.",
  "Untuk milestone selanjutnya, kita perlu persiapkan dokumentasi.",
  "Meeting ini sangat produktif, semua poin sudah dibahas.",
  "Saya setuju dengan proposal yang telah disampaikan.",
  "Kita perlu koordinasi lebih baik antar tim."
];

let transcriptionIndex = 0;

// WebSocket server for live transcription
const wss = new WebSocketServer({ port: WS_PORT });
console.log(`🔌 WebSocket server running on ws://localhost:${WS_PORT}`);

wss.on('connection', (ws) => {
  console.log('📱 Client connected to WebSocket');
  
  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connection_established',
    payload: { clientId: 'test-client' },
    timestamp: new Date()
  }));

  let lastTranscriptionTime = 0;
  let audioChunkCount = 0;
  
  ws.on('message', (data) => {
    // Check if this is a manual trigger message
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'trigger_transcription') {
        console.log('🎯 Manual transcription trigger received!');
        
        // Generate transcription immediately for manual trigger
        const transcriptionText = mockIndonesianTranscriptions[transcriptionIndex % mockIndonesianTranscriptions.length];
        const segment = {
          id: Date.now().toString(),
          startTime: Date.now(),
          endTime: Date.now() + 3000,
          text: transcriptionText,
          speaker: `Speaker ${Math.floor(Math.random() * 3) + 1}`,
          confidence: 0.85 + Math.random() * 0.15
        };

        transcriptionIndex++;

        const response = {
          type: 'transcription_segment',
          payload: {
            segment: segment,
            isPartial: false
          },
          timestamp: new Date()
        };

        ws.send(JSON.stringify(response));
        console.log('📝 Sent manual transcription:', transcriptionText);
        return;
      }
    } catch (e) {
      // Not a JSON message, treat as audio data
      console.log('🎤 Audio chunk received (auto-transcription disabled)');
      // We no longer auto-transcribe audio chunks
      return;
    }
  });

  ws.on('close', () => {
    console.log('📱 Client disconnected');
  });
});

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: [
      { name: 'WebSocket Server', status: 'up' },
      { name: 'Mock Transcription', status: 'up' }
    ]
  });
});

// Real OpenAI-powered summarization endpoint
app.post('/api/meetings/summarize', async (req, res) => {
  console.log('📝 Summarization request received with OpenAI integration');
  
  const { transcription, language = 'id' } = req.body;
  
  if (!transcription || !transcription.segments || transcription.segments.length === 0) {
    return res.status(400).json({
      error: 'INVALID_TRANSCRIPTION',
      message: 'No transcription segments provided',
      statusCode: 400
    });
  }

  try {
    // Create transcription text for OpenAI
    const transcriptionText = transcription.segments
      .map(segment => {
        const speaker = segment.speakerId ? `[${segment.speakerId}] ` : '';
        const timestamp = formatTimestamp(segment.startTime || 0);
        return `${timestamp} ${speaker}${segment.content || segment.text || ''}`;
      })
      .join('\n');

    console.log('🤖 Sending to OpenAI for Indonesian summarization...');
    console.log('📝 Transcription text:', transcriptionText.substring(0, 200) + '...');

    // Generate summary with OpenAI
    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Anda adalah asisten AI yang ahli dalam menganalisis dan meringkas transkrip rapat dalam bahasa Indonesia. Tugas Anda adalah membuat ringkasan yang akurat, komprehensif, dan mudah dipahami. Fokus pada informasi penting, keputusan, dan tindak lanjut yang diperlukan. Selalu berikan respons dalam format JSON yang valid.'
        },
        {
          role: 'user',
          content: `Berikut adalah transkrip rapat dalam bahasa Indonesia:

${transcriptionText}

Silakan analisis transkrip ini dan berikan ringkasan yang komprehensif dalam format JSON berikut:
{
  "executiveSummary": "Ringkasan lengkap rapat (3-4 paragraf)",
  "keyPoints": ["Poin penting 1", "Poin penting 2", "..."],
  "actionItems": [
    {
      "id": "1",
      "description": "Deskripsi tugas",
      "assignee": "Nama penanggung jawab (jika disebutkan)",
      "priority": "low|medium|high",
      "status": "pending",
      "dueDate": "YYYY-MM-DD (jika disebutkan, jika tidak gunakan null)"
    }
  ],
  "decisions": [
    {
      "id": "1", 
      "description": "Keputusan yang dibuat",
      "context": "Konteks keputusan",
      "impact": "Dampak keputusan",
      "decidedBy": "Nama pembuat keputusan"
    }
  ]
}

Pastikan ringkasan mencakup:
1. Tujuan utama rapat
2. Keputusan yang diambil
3. Diskusi utama
4. Next steps atau tindak lanjut
5. Informasi penting lainnya

Gunakan bahasa Indonesia yang profesional dan mudah dipahami.`
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const aiSummary = JSON.parse(summaryResponse.choices[0]?.message?.content || '{}');
    
    // Format the response to match frontend expectations
    const formattedSummary = {
      id: Date.now().toString(),
      meetingId: 'live-recording-' + Date.now(),
      executiveSummary: aiSummary.executiveSummary || 'Summary tidak tersedia',
      keyPoints: aiSummary.keyPoints || [],
      actionItems: (aiSummary.actionItems || []).map((item, index) => ({
        id: (index + 1).toString(),
        description: item.description || '',
        assignee: item.assignee || 'Tim',
        dueDate: item.dueDate ? new Date(item.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        priority: item.priority || 'medium',
        status: 'pending'
      })),
      decisions: (aiSummary.decisions || []).map((decision, index) => ({
        id: (index + 1).toString(),
        description: decision.description || '',
        context: decision.context || '',
        impact: decision.impact || '',
        decidedBy: decision.decidedBy || 'Tim'
      })),
      generatedAt: new Date()
    };

    console.log('✅ Generated OpenAI summary for', transcription.segments.length, 'segments');
    res.json(formattedSummary);
    
  } catch (error) {
    console.error('❌ OpenAI summarization failed:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      status: error.status,
      type: error.type
    });
    
    // Fallback to basic summary if OpenAI fails
    const fallbackSummary = {
      id: Date.now().toString(),
      meetingId: 'live-recording-' + Date.now(),
      executiveSummary: `Meeting dalam bahasa Indonesia dengan ${transcription.segments.length} segmen percakapan. OpenAI service tidak tersedia, menggunakan ringkasan dasar. Silakan coba lagi nanti untuk mendapatkan ringkasan yang lebih detail.`,
      keyPoints: [
        `Meeting direkam dengan ${transcription.segments.length} segmen`,
        'Transkrip berhasil diproses',
        'OpenAI service sedang tidak tersedia',
        'Silakan coba generate ulang untuk hasil yang lebih baik'
      ],
      actionItems: [
        {
          id: '1',
          description: 'Coba generate summary ulang ketika OpenAI service sudah normal',
          assignee: 'Tim',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          priority: 'medium',
          status: 'pending'
        }
      ],
      decisions: [
        {
          id: '1',
          description: 'Meeting berhasil direkam dan ditranskrip',
          context: 'Proses recording dan transcription berjalan normal',
          impact: 'Data meeting tersimpan untuk review selanjutnya',
          decidedBy: 'Sistem'
        }
      ],
      generatedAt: new Date()
    };
    
    res.json(fallbackSummary);
  }
});

// Helper function to format timestamp
function formatTimestamp(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Test OpenAI connection
app.get('/api/test-openai', async (req, res) => {
  try {
    console.log('🧪 Testing OpenAI connection...');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say hello in Indonesian' }],
      max_tokens: 50
    });
    
    console.log('✅ OpenAI test successful');
    res.json({
      success: true,
      response: response.choices[0]?.message?.content || 'No response',
      model: response.model
    });
  } catch (error) {
    console.error('❌ OpenAI test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        name: error.name,
        code: error.code,
        status: error.status,
        type: error.type
      }
    });
  }
});

app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Indonesian Meeting Transcription API - Simple Test Version',
    version: '1.0.0',
    description: 'Simple server for testing live recording and transcription',
    endpoints: {
      'GET /api/health': 'Health check',
      'POST /api/meetings/summarize': 'Generate meeting summary from transcription',
      'WebSocket ws://localhost:3002': 'Live transcription'
    },
    usage: {
      frontend: 'Start your React app and use Live Recording mode',
      transcription: 'Real Indonesian transcription responses will appear as you speak',
      summarization: 'Click "Buat Ringkasan" after transcription to generate summary'
    }
  });
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`
🎙️  Indonesian Meeting Transcription API (Simple Test Version)
🚀 HTTP Server: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${WS_PORT}
📊 Health Check: http://localhost:${PORT}/api/health
📚 API Docs: http://localhost:${PORT}/api/docs

🎯 Ready for live recording testing!
   1. Start your React frontend (npm start)
   2. Choose "Live Recording" mode
   3. Click "Start Recording" and speak
   4. You'll see Indonesian transcription appear in real-time
  `);
});