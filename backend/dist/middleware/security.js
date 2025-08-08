"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityLogger = exports.apiKeyAuth = exports.ipWhitelist = exports.securityErrorHandler = exports.fileUploadSecurity = exports.validateRequest = exports.securityHeaders = exports.requestId = exports.compressionConfig = exports.helmetConfig = exports.rateLimiter = exports.corsOptions = void 0;
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const compression_1 = __importDefault(require("compression"));
const config_1 = __importDefault(require("@/config"));
exports.corsOptions = {
    origin: config_1.default.cors.origin,
    credentials: config_1.default.cors.credentials,
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
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.default.rateLimit.windowMs,
    max: config_1.default.rateLimit.maxRequests,
    message: {
        error: 'API_RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        statusCode: 429,
        retryAfter: Math.ceil(config_1.default.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'API_RATE_LIMIT_EXCEEDED',
            message: 'Too many requests from this IP, please try again later.',
            statusCode: 429,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
        });
    }
});
exports.helmetConfig = (0, helmet_1.default)({
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
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});
exports.compressionConfig = (0, compression_1.default)({
    filter: (req, res) => {
        const contentType = res.getHeader('content-type');
        if (contentType && contentType.startsWith('audio/')) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
    threshold: 1024,
    level: 6
});
const requestId = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || generateRequestId();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};
exports.requestId = requestId;
const securityHeaders = (req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.setHeader('X-API-Version', '1.0.0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'microphone=(), camera=(), geolocation=()');
    next();
};
exports.securityHeaders = securityHeaders;
const validateRequest = (req, res, next) => {
    const suspiciousPatterns = [
        /\.\./,
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i,
        /union\s+select/i
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
exports.validateRequest = validateRequest;
const fileUploadSecurity = (req, res, next) => {
    if (req.is('multipart/form-data')) {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        if (contentLength > config_1.default.audio.maxFileSize * 1.1) {
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
exports.fileUploadSecurity = fileUploadSecurity;
const securityErrorHandler = (error, req, res, next) => {
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
    next(error);
};
exports.securityErrorHandler = securityErrorHandler;
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
const ipWhitelist = (allowedIPs) => {
    return (req, res, next) => {
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
exports.ipWhitelist = ipWhitelist;
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKeys = process.env.API_KEYS?.split(',') || [];
    if (config_1.default.server.env === 'development' || validApiKeys.length === 0) {
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
exports.apiKeyAuth = apiKeyAuth;
const securityLogger = (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    res.send = function (data) {
        const responseTime = Date.now() - startTime;
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
exports.securityLogger = securityLogger;
//# sourceMappingURL=security.js.map