"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    server: {
        port: parseInt(process.env.PORT || '3001', 10),
        host: process.env.HOST || 'localhost',
        env: process.env.NODE_ENV || 'development'
    },
    audio: {
        maxFileSize: parseFileSize(process.env.MAX_FILE_SIZE || '100MB'),
        supportedFormats: [
            'audio/mpeg',
            'audio/mp4',
            'audio/wav',
            'audio/webm',
            'audio/ogg',
            'audio/flac',
            'audio/m4a'
        ],
        uploadPath: process.env.AUDIO_UPLOAD_PATH || './uploads/audio',
        processedPath: process.env.PROCESSED_AUDIO_PATH || './uploads/processed'
    },
    whisper: {
        modelPath: process.env.WHISPER_MODEL_PATH || './models/whisper',
        modelSize: process.env.WHISPER_MODEL_SIZE || 'base',
        language: process.env.WHISPER_LANGUAGE || 'id'
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.GPT_MODEL || 'gpt-4',
        maxTokens: parseInt(process.env.GPT_MAX_TOKENS || '2000', 10),
        temperature: parseFloat(process.env.GPT_TEMPERATURE || '0.3')
    },
    websocket: {
        port: parseInt(process.env.WS_PORT || '3002', 10),
        heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000', 10)
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
    },
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: process.env.LOG_FILE_PATH || './logs/app.log'
    },
    cleanup: {
        intervalHours: parseInt(process.env.CLEANUP_INTERVAL_HOURS || '24', 10),
        maxFileAgeHours: parseInt(process.env.MAX_FILE_AGE_HOURS || '48', 10)
    }
};
function parseFileSize(sizeStr) {
    const size = parseInt(sizeStr.replace(/[^\d]/g, ''), 10);
    if (sizeStr.toLowerCase().includes('gb'))
        return size * 1024 * 1024 * 1024;
    if (sizeStr.toLowerCase().includes('mb'))
        return size * 1024 * 1024;
    if (sizeStr.toLowerCase().includes('kb'))
        return size * 1024;
    return size;
}
if (!config.openai.apiKey && config.server.env !== 'test') {
    throw new Error('OPENAI_API_KEY is required');
}
exports.default = config;
//# sourceMappingURL=index.js.map