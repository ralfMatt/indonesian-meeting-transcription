// Application Configuration Constants
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  WEBSOCKET_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:3002',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;

export const RECORDING_CONFIG = {
  CHUNK_INTERVAL: 1000, // 1 second
  SAMPLE_RATE: 44100,
  CHANNELS: 1,
  SUPPORTED_FORMATS: ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg'],
  SUPPORTED_MIME_TYPES: [
    'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/x-wav',
    'audio/m4a', 'audio/mp4', 'audio/ogg', 'audio/webm'
  ],
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MIN_FILE_SIZE: 1024, // 1KB minimum
  MAX_FILENAME_LENGTH: 255,
} as const;

export const UI_CONFIG = {
  PROCESSING_DELAY: 3000, // Mock processing delay
  DEBOUNCE_DELAY: 500,
  MAX_SEGMENTS_DISPLAY: 100,
  TOUCH_TARGET_MIN_SIZE: 44, // px - WCAG AA compliance
} as const;

export const SPEECH_CONFIG = {
  LANGUAGE: 'id-ID',
  CONTINUOUS: true,
  INTERIM_RESULTS: true,
  MAX_ALTERNATIVES: 1,
} as const;

export const ERROR_MESSAGES = {
  MIC_ACCESS_DENIED: 'Akses mikrofon ditolak. Silakan berikan izin akses mikrofon.',
  NETWORK_ERROR: 'Koneksi bermasalah. Periksa koneksi internet Anda.',
  RECORDING_ERROR: 'Terjadi kesalahan saat merekam. Silakan coba lagi.',
  FILE_TOO_LARGE: 'File terlalu besar. Maksimal 100MB.',
  UNSUPPORTED_FORMAT: 'Format file tidak didukung. Gunakan MP3, WAV, M4A, atau OGG.',
  API_ERROR: 'Gagal terhubung ke server. Silakan coba lagi.',
};