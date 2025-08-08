import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import config from '@/config';

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID'
  ],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
  optionsSuccessStatus: 200
};

/**
 * Rate limiting configuration
 */
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'API_RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'API_RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      statusCode: 429,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    });
  }
});

/**
 * Helmet security configuration
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow audio file processing
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Compression middleware configuration
 */
export const compressionConfig = compression({
  filter: (req: Request, res: Response) => {
    // Don't compress audio files or already compressed data
    const contentType = res.getHeader('content-type') as string;
    if (contentType && contentType.startsWith('audio/')) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024,
  level: 6
});

/**
 * Request ID middleware for tracing
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Add custom security headers
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(), camera=(), geolocation=()');

  next();
};

/**
 * Input validation middleware
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Check for malicious patterns in URL
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /<script/i,       // XSS
    /javascript:/i,   // JavaScript injection
    /vbscript:/i,     // VBScript injection
    /on\w+\s*=/i,     // Event handlers
    /union\s+select/i // SQL injection
  ];

  const url = req.url.toLowerCase();
  const query = JSON.stringify(req.query).toLowerCase();
  const body = typeof req.body === 'string' ? req.body.toLowerCase() : JSON.stringify(req.body).toLowerCase();

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(query) || pattern.test(body)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request detected',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
      return;
    }
  }

  next();
};

/**
 * File upload security middleware
 */
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction): void => {
  // Check if it's a file upload request
  if (req.is('multipart/form-data')) {
    // Additional security checks for file uploads
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    // Check overall request size (including metadata)
    if (contentLength > config.audio.maxFileSize * 1.1) { // 10% buffer for metadata
      res.status(413).json({
        error: 'FILE_TOO_LARGE',
        message: 'Request entity too large',
        statusCode: 413,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
      return;
    }
  }

  next();
};

/**
 * Error handling middleware for security errors
 */
export const securityErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log security-related errors
  if (error.code === 'EBADCSRFTOKEN') {
    console.warn(`CSRF token mismatch from ${req.ip}:`, {
      url: req.url,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id']
    });

    res.status(403).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid CSRF token',
      statusCode: 403,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    });
    return;
  }

  if (error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT') {
    res.status(413).json({
      error: 'AUDIO_UPLOAD_FAILED',
      message: error.message,
      statusCode: 413,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    });
    return;
  }

  // Pass other errors to the next error handler
  next(error);
};

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * IP whitelist middleware (for production use)
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      console.warn(`Blocked request from unauthorized IP: ${clientIP}`);
      res.status(403).json({
        error: 'UNAUTHORIZED_ACCESS',
        message: 'Access denied from this IP address',
        statusCode: 403,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
      return;
    }

    next();
  };
};

/**
 * API key authentication middleware (optional)
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKeys = process.env.API_KEYS?.split(',') || [];

  // Skip API key validation in development
  if (config.server.env === 'development' || validApiKeys.length === 0) {
    next();
    return;
  }

  if (!apiKey || !validApiKeys.includes(apiKey)) {
    res.status(401).json({
      error: 'UNAUTHORIZED_ACCESS',
      message: 'Valid API key required',
      statusCode: 401,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    });
    return;
  }

  next();
};

/**
 * Request logging middleware for security monitoring
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log suspicious activity
    if (res.statusCode >= 400) {
      console.warn('Security Event:', {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        responseTime,
        requestId: req.headers['x-request-id']
      });
    }

    return originalSend.call(this, data);
  };

  next();
};