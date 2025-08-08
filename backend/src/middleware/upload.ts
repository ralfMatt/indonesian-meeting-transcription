import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '@/config';
import { Request } from 'express';

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, config.audio.uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `audio-${uniqueSuffix}${extension}`);
  }
});

// File filter for audio files only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.audio.supportedFormats.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Supported formats: ${config.audio.supportedFormats.join(', ')}`));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.audio.maxFileSize,
    files: 1,
    fields: 10
  }
});

// Middleware for single audio file upload
export const audioUpload = upload.single('audio');

// Error handling middleware for multer errors
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: 'AUDIO_UPLOAD_FAILED',
          message: `File too large. Maximum size allowed: ${formatFileSize(config.audio.maxFileSize)}`,
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

  // Pass other errors to the next error handler
  next(error);
};

// Helper function to format file size
function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export default { audioUpload, handleUploadError };