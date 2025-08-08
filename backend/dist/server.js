"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioProcessingService = exports.wsService = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const node_cron_1 = __importDefault(require("node-cron"));
const audioProcessingService_1 = require("@/services/audioProcessingService");
const websocketService_1 = require("@/services/websocketService");
const routes_1 = require("@/routes");
const security_1 = require("@/middleware/security");
const config_1 = __importDefault(require("@/config"));
const app = (0, express_1.default)();
exports.app = app;
const wsService = new websocketService_1.WebSocketService();
exports.wsService = wsService;
const audioProcessingService = new audioProcessingService_1.AudioProcessingService();
exports.audioProcessingService = audioProcessingService;
app.set('trust proxy', 1);
app.use(security_1.helmetConfig);
app.use(require('cors')(security_1.corsOptions));
app.use(security_1.compressionConfig);
app.use(security_1.requestId);
app.use(security_1.securityHeaders);
app.use(security_1.securityLogger);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
if (config_1.default.server.env !== 'test') {
    app.use((0, morgan_1.default)('combined', {
        skip: (req, res) => req.url === '/api/health' && res.statusCode < 400
    }));
}
app.use('/api', security_1.rateLimiter);
app.use(security_1.validateRequest);
app.use(security_1.fileUploadSecurity);
app.use('/api', (0, routes_1.initializeRoutes)(wsService));
app.get('/', (req, res) => {
    res.json({
        name: 'Indonesian Meeting Transcription API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/health',
            docs: '/api/docs',
            upload: 'POST /api/meetings/upload',
            websocket: `ws://localhost:${config_1.default.websocket.port}`
        }
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Endpoint not found',
        statusCode: 404,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        availableEndpoints: [
            'GET /api/health',
            'GET /api/docs',
            'POST /api/meetings/upload',
            'GET /api/meetings',
            'GET /api/meetings/:id',
            'DELETE /api/meetings/:id',
            'WebSocket ws://localhost:' + config_1.default.websocket.port
        ]
    });
});
app.use(security_1.securityErrorHandler);
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    const isDevelopment = config_1.default.server.env === 'development';
    res.status(error.statusCode || 500).json({
        error: error.code || 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? error.message : 'Internal server error',
        statusCode: error.statusCode || 500,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        ...(isDevelopment && { stack: error.stack })
    });
});
const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    try {
        await wsService.close();
        console.log('WebSocket server closed');
        node_cron_1.default.getTasks().forEach(task => task.stop());
        console.log('Scheduled tasks stopped');
        server.close((error) => {
            if (error) {
                console.error('Error closing HTTP server:', error);
                process.exit(1);
            }
            console.log('HTTP server closed');
            process.exit(0);
        });
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    }
    catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
const server = app.listen(config_1.default.server.port, config_1.default.server.host, () => {
    console.log(`
🎙️  Indonesian Meeting Transcription API
🚀 Server running on http://${config_1.default.server.host}:${config_1.default.server.port}
🔌 WebSocket server on ws://${config_1.default.server.host}:${config_1.default.websocket.port}
📝 API Documentation: http://${config_1.default.server.host}:${config_1.default.server.port}/api/docs
🏥 Health Check: http://${config_1.default.server.host}:${config_1.default.server.port}/api/health
🌍 Environment: ${config_1.default.server.env}
📊 Rate Limit: ${config_1.default.rateLimit.maxRequests} requests per ${config_1.default.rateLimit.windowMs / 1000}s
💾 Max File Size: ${Math.round(config_1.default.audio.maxFileSize / (1024 * 1024))}MB
  `);
});
exports.server = server;
wsService.initialize(config_1.default.websocket.port);
if (config_1.default.server.env !== 'test') {
    node_cron_1.default.schedule('0 2 * * *', async () => {
        console.log('Running daily cleanup job...');
        try {
            await audioProcessingService.cleanupOldFiles();
            console.log('Daily cleanup completed successfully');
        }
        catch (error) {
            console.error('Daily cleanup failed:', error);
        }
    });
}
//# sourceMappingURL=server.js.map