"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadError = exports.audioUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("@/config"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config_1.default.audio.uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = (0, uuid_1.v4)();
        const extension = path_1.default.extname(file.originalname);
        cb(null, `audio-${uniqueSuffix}${extension}`);
    }
});
const fileFilter = (req, file, cb) => {
    if (config_1.default.audio.supportedFormats.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Unsupported file type: ${file.mimetype}. Supported formats: ${config_1.default.audio.supportedFormats.join(', ')}`));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: config_1.default.audio.maxFileSize,
        files: 1,
        fields: 10
    }
});
exports.audioUpload = upload.single('audio');
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    error: 'AUDIO_UPLOAD_FAILED',
                    message: `File too large. Maximum size allowed: ${formatFileSize(config_1.default.audio.maxFileSize)}`,
                    statusCode: 400
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    error: 'AUDIO_UPLOAD_FAILED',
                    message: 'Too many files. Only one audio file allowed.',
                    statusCode: 400
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    error: 'AUDIO_UPLOAD_FAILED',
                    message: 'Unexpected field name. Use "audio" field for file upload.',
                    statusCode: 400
                });
            default:
                return res.status(400).json({
                    error: 'AUDIO_UPLOAD_FAILED',
                    message: `Upload error: ${error.message}`,
                    statusCode: 400
                });
        }
    }
    if (error.message.includes('Unsupported file type')) {
        return res.status(400).json({
            error: 'INVALID_AUDIO_FORMAT',
            message: error.message,
            statusCode: 400
        });
    }
    next(error);
};
exports.handleUploadError = handleUploadError;
function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0)
        return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}
exports.default = { audioUpload: exports.audioUpload, handleUploadError: exports.handleUploadError };
//# sourceMappingURL=upload.js.map