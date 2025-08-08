import express from 'express';
import morgan from 'morgan';
import cron from 'node-cron';
import { AudioProcessingService } from '@/services/audioProcessingService';
import { WebSocketService } from '@/services/websocketService';
import { initializeRoutes } from '@/routes';
import {
  corsOptions,
  rateLimiter,
  helmetConfig,
  compressionConfig,
  requestId,
  securityHeaders,
  validateRequest,
  fileUploadSecurity,
  securityErrorHandler,
  securityLogger
} from '@/middleware/security';
import config from '@/config';

// Create Express app
const app = express();

// Initialize services
const wsService = new WebSocketService();
const audioProcessingService = new AudioProcessingService();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmetConfig);
app.use(require('cors')(corsOptions));
app.use(compressionConfig);
app.use(requestId);
app.use(securityHeaders);
app.use(securityLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.server.env !== 'test') {
  app.use(morgan('combined', {
    skip: (req, res) => req.url === '/api/health' && res.statusCode < 400
  }));
}

// Rate limiting
app.use('/api', rateLimiter);

// Request validation
app.use(validateRequest);
app.use(fileUploadSecurity);

// API routes
app.use('/api', initializeRoutes(wsService));

// Root endpoint
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
      websocket: `ws://localhost:${config.websocket.port}`
    }
  });
});

// 404 handler
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
      'WebSocket ws://localhost:' + config.websocket.port
    ]
  });
});

// Security error handler
app.use(securityErrorHandler);

// Global error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);

  // Don't leak error details in production
  const isDevelopment = config.server.env === 'development';
  
  res.status(error.statusCode || 500).json({
    error: error.code || 'INTERNAL_SERVER_ERROR',
    message: isDevelopment ? error.message : 'Internal server error',
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'],
    ...(isDevelopment && { stack: error.stack })
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  try {
    // Close WebSocket server
    await wsService.close();
    console.log('WebSocket server closed');

    // Stop cron jobs
    cron.getTasks().forEach(task => task.stop());
    console.log('Scheduled tasks stopped');

    // Close HTTP server
    server.close((error) => {
      if (error) {
        console.error('Error closing HTTP server:', error);
        process.exit(1);
      }
      console.log('HTTP server closed');
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const server = app.listen(config.server.port, config.server.host, () => {
  console.log(`
🎙️  Indonesian Meeting Transcription API
🚀 Server running on http://${config.server.host}:${config.server.port}
🔌 WebSocket server on ws://${config.server.host}:${config.websocket.port}
📝 API Documentation: http://${config.server.host}:${config.server.port}/api/docs
🏥 Health Check: http://${config.server.host}:${config.server.port}/api/health
🌍 Environment: ${config.server.env}
📊 Rate Limit: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000}s
💾 Max File Size: ${Math.round(config.audio.maxFileSize / (1024 * 1024))}MB
  `);
});

// Initialize WebSocket server
wsService.initialize(config.websocket.port);

// Schedule cleanup job (runs daily at 2 AM)
if (config.server.env !== 'test') {
  cron.schedule('0 2 * * *', async () => {
    console.log('Running daily cleanup job...');
    try {
      await audioProcessingService.cleanupOldFiles();
      console.log('Daily cleanup completed successfully');
    } catch (error) {
      console.error('Daily cleanup failed:', error);
    }
  });
}

// Export for testing
export { app, server, wsService, audioProcessingService };