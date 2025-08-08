// Core domain types for Indonesian Meeting Transcription API

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  status: MeetingStatus;
  audioFile?: AudioFile;
  transcription?: Transcription;
  summary?: MeetingSummary;
  participants: string[];
  language: 'id' | 'en';
  duration?: number; // in seconds
}

export type MeetingStatus = 
  | 'uploading'
  | 'processing' 
  | 'transcribing'
  | 'summarizing'
  | 'completed'
  | 'failed'
  | 'live_recording'
  | 'live_processing';

export interface AudioFile {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  uploadedAt: Date;
  processedPath?: string;
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  confidence: number;
  isPartial?: boolean;
  language: string;
}

export interface Transcription {
  id: string;
  meetingId: string;
  segments: TranscriptionSegment[];
  speakers: Speaker[];
  language: string;
  confidence: number;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
  status: TranscriptionStatus;
  processingMetadata?: ProcessingMetadata;
}

export type TranscriptionStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'live_processing';

export interface Speaker {
  id: string;
  name?: string;
  confidence: number;
  segments: number; // number of segments spoken
  totalDuration: number; // in seconds
}

export interface ProcessingMetadata {
  whisperModel: string;
  processingTime: number;
  audioPreprocessing?: {
    normalizedVolume: boolean;
    noiseReduction: boolean;
    originalFormat: string;
    processedFormat: string;
  };
}

export interface MeetingSummary {
  id: string;
  meetingId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  participants: string[];
  topics: Topic[];
  sentiment: SentimentAnalysis;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  gptModel: string;
  processingTime: number;
}

export interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  extractedAt: Date;
}

export interface Topic {
  id: string;
  name: string;
  confidence: number;
  mentions: number;
  timeSpent: number; // in seconds
  keyPhrases: string[];
}

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  confidence: number;
  segments: SentimentSegment[];
}

export interface SentimentSegment {
  startTime: number;
  endTime: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

// API Request/Response types
export interface UploadAudioRequest {
  title?: string;
  description?: string;
  participants?: string[];
  language?: 'id' | 'en';
}

export interface UploadAudioResponse {
  meetingId: string;
  message: string;
  status: MeetingStatus;
  estimatedProcessingTime: number;
}

export interface TranscriptionResponse {
  meetingId: string;
  transcription: Transcription;
  status: MeetingStatus;
}

export interface SummaryResponse {
  meetingId: string;
  summary: MeetingSummary;
  status: MeetingStatus;
}

export interface MeetingResponse {
  meeting: Meeting;
  transcription?: Transcription;
  summary?: MeetingSummary;
}

// WebSocket message types
export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  meetingId?: string;
  timestamp: Date;
}

export type WSMessageType = 
  | 'audio_chunk'
  | 'transcription_segment'
  | 'transcription_update'
  | 'processing_status'
  | 'error'
  | 'connection_established'
  | 'connection_closed';

export interface AudioChunkMessage extends WSMessage {
  type: 'audio_chunk';
  payload: {
    audioData: ArrayBuffer;
    sequence: number;
    isLast: boolean;
  };
}

export interface TranscriptionSegmentMessage extends WSMessage {
  type: 'transcription_segment';
  payload: {
    segment: TranscriptionSegment;
    isPartial: boolean;
  };
}

export interface ProcessingStatusMessage extends WSMessage {
  type: 'processing_status';
  payload: {
    status: MeetingStatus;
    progress: number; // 0-100
    message: string;
    estimatedTimeRemaining?: number;
  };
}

export interface ErrorMessage extends WSMessage {
  type: 'error';
  payload: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Error handling
export type ErrorCode = 
  | 'AUDIO_UPLOAD_FAILED'
  | 'AUDIO_PROCESSING_FAILED'
  | 'TRANSCRIPTION_FAILED'
  | 'SUMMARIZATION_FAILED'
  | 'INVALID_AUDIO_FORMAT'
  | 'FILE_TOO_LARGE'
  | 'INSUFFICIENT_STORAGE'
  | 'API_RATE_LIMIT_EXCEEDED'
  | 'OPENAI_API_ERROR'
  | 'WHISPER_MODEL_ERROR'
  | 'WEBSOCKET_CONNECTION_ERROR'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR'
  | 'MEETING_NOT_FOUND'
  | 'UNAUTHORIZED_ACCESS';

export interface ApiError {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  timestamp: Date;
  requestId?: string;
}

// Configuration types
export interface AppConfig {
  server: {
    port: number;
    host: string;
    env: 'development' | 'production' | 'test';
  };
  audio: {
    maxFileSize: number;
    supportedFormats: string[];
    uploadPath: string;
    processedPath: string;
  };
  whisper: {
    modelPath: string;
    modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large';
    language: string;
  };
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  websocket: {
    port: number;
    heartbeatInterval: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    filePath: string;
  };
  cleanup: {
    intervalHours: number;
    maxFileAgeHours: number;
  };
}

// Database types (if using a database later)
export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mysql';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  synchronize: boolean;
  logging: boolean;
}

// Utility types
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Required<T> = {
  [P in keyof T]-?: T[P];
};

export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Health check types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  version: string;
  services: ServiceHealth[];
  uptime: number;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: Record<string, unknown>;
}