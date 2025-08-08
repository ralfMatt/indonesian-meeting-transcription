"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRoutes = void 0;
const express_1 = require("express");
const upload_1 = require("@/middleware/upload");
const audioController_1 = require("@/controllers/audioController");
const router = (0, express_1.Router)();
let wsService;
const initializeRoutes = (websocketService) => {
    wsService = websocketService;
    const audioController = new audioController_1.AudioController(wsService);
    router.get('/health', (req, res) => {
        const wsStats = wsService.getStats();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            services: [
                {
                    name: 'WebSocket Server',
                    status: wsService.isRunning() ? 'up' : 'down',
                    details: wsStats
                },
                {
                    name: 'Audio Processing',
                    status: 'up'
                },
                {
                    name: 'Transcription Service',
                    status: 'up'
                },
                {
                    name: 'Summarization Service',
                    status: 'up'
                }
            ],
            uptime: process.uptime()
        });
    });
    router.post('/meetings/upload', upload_1.audioUpload, upload_1.handleUploadError, audioController.uploadAudio);
    router.get('/meetings', audioController.getAllMeetings);
    router.get('/meetings/:meetingId', audioController.getMeeting);
    router.delete('/meetings/:meetingId', audioController.deleteMeeting);
    router.get('/meetings/:meetingId/transcription', audioController.getTranscription);
    router.get('/meetings/:meetingId/summary', audioController.getSummary);
    router.post('/meetings/summarize', audioController.generateSummaryFromTranscription);
    router.get('/docs', (req, res) => {
        res.json({
            title: 'Indonesian Meeting Transcription API',
            version: '1.0.0',
            description: 'API for transcribing and summarizing Indonesian meeting recordings',
            endpoints: {
                'POST /api/meetings/upload': {
                    description: 'Upload audio file for transcription',
                    parameters: {
                        audio: 'Audio file (multipart/form-data)',
                        title: 'Meeting title (optional)',
                        description: 'Meeting description (optional)',
                        participants: 'Array of participant names (optional)',
                        language: 'Language code (id/en, default: id)'
                    },
                    response: {
                        meetingId: 'string',
                        message: 'string',
                        status: 'string',
                        estimatedProcessingTime: 'number'
                    }
                },
                'GET /api/meetings': {
                    description: 'Get all meetings',
                    response: {
                        meetings: 'Array of meeting objects',
                        total: 'number'
                    }
                },
                'GET /api/meetings/:meetingId': {
                    description: 'Get meeting details with transcription and summary',
                    response: {
                        meeting: 'Meeting object',
                        transcription: 'Transcription object (optional)',
                        summary: 'Summary object (optional)'
                    }
                },
                'GET /api/meetings/:meetingId/transcription': {
                    description: 'Get transcription for a meeting',
                    response: {
                        meetingId: 'string',
                        transcription: 'Transcription object',
                        status: 'string'
                    }
                },
                'GET /api/meetings/:meetingId/summary': {
                    description: 'Get summary for a meeting',
                    response: {
                        meetingId: 'string',
                        summary: 'Summary object',
                        status: 'string'
                    }
                },
                'DELETE /api/meetings/:meetingId': {
                    description: 'Delete a meeting and cleanup files',
                    response: 'No content (204)'
                },
                'GET /api/health': {
                    description: 'Health check endpoint',
                    response: {
                        status: 'string',
                        timestamp: 'string',
                        version: 'string',
                        services: 'Array of service health objects',
                        uptime: 'number'
                    }
                },
                'WebSocket /ws': {
                    description: 'Real-time transcription WebSocket endpoint',
                    port: 3002,
                    messages: {
                        audio_chunk: 'Send audio data for real-time transcription',
                        transcription_segment: 'Receive transcription segments',
                        processing_status: 'Receive processing status updates',
                        error: 'Receive error messages'
                    }
                }
            },
            examples: {
                uploadAudio: {
                    curl: 'curl -X POST -F "audio=@meeting.mp3" -F "title=Team Meeting" http://localhost:3001/api/meetings/upload'
                },
                getMeeting: {
                    curl: 'curl http://localhost:3001/api/meetings/{meetingId}'
                },
                websocket: {
                    javascript: `
const ws = new WebSocket('ws://localhost:3002');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

// Send audio chunk
const audioData = new ArrayBuffer(1024);
ws.send(audioData);
          `.trim()
                }
            },
            supportedAudioFormats: [
                'audio/mpeg (MP3)',
                'audio/mp4 (M4A)',
                'audio/wav (WAV)',
                'audio/webm (WebM)',
                'audio/ogg (OGG)',
                'audio/flac (FLAC)'
            ],
            limits: {
                maxFileSize: '100MB',
                maxRequestsPerWindow: '100 requests per 15 minutes',
                supportedLanguages: ['id (Indonesian)', 'en (English)']
            }
        });
    });
    return router;
};
exports.initializeRoutes = initializeRoutes;
exports.default = router;
//# sourceMappingURL=index.js.map