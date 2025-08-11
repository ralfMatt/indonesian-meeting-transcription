export interface Meeting {
  id: string;
  title: string;
  scheduledAt: Date;
  duration: number;
  participants: Participant[];
  status: MeetingStatus;
  privacyLevel: PrivacyLevel;
  audioFile?: AudioFile;
  transcription?: Transcription;
  summary?: MeetingSummary;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  role: string;
  speakerId?: string;
}

export interface AudioFile {
  id: string;
  filename: string;
  duration: number;
  size: number;
  format: string;
  uploadedAt: Date;
  processingStatus: ProcessingStatus;
}

export interface Transcription {
  id: string;
  meetingId: string;
  segments: TranscriptionSegment[];
  speakers: SpeakerProfile[];
  processingStatus: ProcessingStatus;
  language: 'id'; // Indonesian
  confidence: number;
}

export interface TranscriptionSegment {
  id: string;
  startTime: number;
  endTime: number;
  speakerId: string;
  content: string;
  confidence: number;
}

export interface SpeakerProfile {
  id: string;
  name?: string;
  audioSignature: string;
  segmentCount: number;
}

export interface MeetingSummary {
  id: string;
  meetingId: string;
  executiveSummary: string;
  actionItems: ActionItem[];
  keyPoints: string[];
  decisions: Decision[];
  generatedAt: Date;
}

export interface ActionItem {
  id: string;
  description: string;
  assignee?: string | undefined;
  dueDate?: Date | undefined;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Decision {
  id: string;
  description: string;
  context: string;
  impact: string;
  decidedBy: string | undefined;
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PrivacyLevel {
  CONFIDENTIAL = 'confidential',
  INTERNAL = 'internal',
  RESTRICTED = 'restricted'
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}