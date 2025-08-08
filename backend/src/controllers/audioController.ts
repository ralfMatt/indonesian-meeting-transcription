import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AudioProcessingService } from '@/services/audioProcessingService';
import { TranscriptionService } from '@/services/transcriptionService';
import { SummarizationService } from '@/services/summarizationService';
import { WebSocketService } from '@/services/websocketService';
import { 
  Meeting, 
  AudioFile, 
  UploadAudioRequest, 
  UploadAudioResponse,
  TranscriptionResponse,
  SummaryResponse,
  MeetingResponse,
  ProcessingStatusMessage
} from '@/types';

interface MeetingStore {
  [key: string]: Meeting;
}

export class AudioController {
  private meetings: MeetingStore = {};
  private audioProcessingService: AudioProcessingService;
  private transcriptionService: TranscriptionService;
  private summarizationService: SummarizationService;
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.audioProcessingService = new AudioProcessingService();
    this.transcriptionService = new TranscriptionService();
    this.summarizationService = new SummarizationService();
    this.wsService = wsService;
  }

  /**
   * Upload audio file and start processing pipeline
   */
  uploadAudio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          error: 'AUDIO_UPLOAD_FAILED',
          message: 'No audio file provided',
          statusCode: 400
        });
        return;
      }

      const body = req.body as UploadAudioRequest;
      const meetingId = uuidv4();
      
      // Validate uploaded file
      await this.audioProcessingService.validateAudioFile(req.file);

      // Create audio file record
      const audioFile: AudioFile = {
        id: uuidv4(),
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date()
      };

      // Create meeting record
      const meeting: Meeting = {
        id: meetingId,
        title: body.title || `Meeting ${new Date().toLocaleDateString()}`,
        description: body.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'processing',
        audioFile,
        participants: body.participants || [],
        language: body.language || 'id'
      };

      this.meetings[meetingId] = meeting;

      // Get processing estimate
      const progress = this.audioProcessingService.getProcessingProgress(req.file.size);

      const response: UploadAudioResponse = {
        meetingId,
        message: 'Audio file uploaded successfully. Processing started.',
        status: 'processing',
        estimatedProcessingTime: progress.estimatedTimeSeconds
      };

      res.status(201).json(response);

      // Start async processing pipeline
      this.processAudioPipeline(meetingId).catch(error => {
        console.error(`Processing failed for meeting ${meetingId}:`, error);
        this.updateMeetingStatus(meetingId, 'failed');
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Get meeting details with transcription and summary
   */
  getMeeting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { meetingId } = req.params;
      
      if (!meetingId) {
        res.status(400).json({
          error: 'INVALID_MEETING_ID',
          message: 'Meeting ID is required',
          statusCode: 400
        });
        return;
      }
      
      const meeting = this.meetings[meetingId];
      if (!meeting) {
        res.status(404).json({
          error: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
          statusCode: 404
        });
        return;
      }

      const response: MeetingResponse = {
        meeting,
        transcription: meeting.transcription,
        summary: meeting.summary
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get transcription for a meeting
   */
  getTranscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { meetingId } = req.params;
      
      if (!meetingId) {
        res.status(400).json({
          error: 'INVALID_MEETING_ID',
          message: 'Meeting ID is required',
          statusCode: 400
        });
        return;
      }
      
      const meeting = this.meetings[meetingId];
      if (!meeting) {
        res.status(404).json({
          error: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
          statusCode: 404
        });
        return;
      }

      if (!meeting.transcription) {
        res.status(202).json({
          message: 'Transcription not ready yet',
          status: meeting.status
        });
        return;
      }

      const response: TranscriptionResponse = {
        meetingId,
        transcription: meeting.transcription,
        status: meeting.status
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get summary for a meeting
   */
  getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { meetingId } = req.params;
      
      if (!meetingId) {
        res.status(400).json({
          error: 'INVALID_MEETING_ID',
          message: 'Meeting ID is required',
          statusCode: 400
        });
        return;
      }
      
      const meeting = this.meetings[meetingId];
      if (!meeting) {
        res.status(404).json({
          error: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
          statusCode: 404
        });
        return;
      }

      if (!meeting.summary) {
        res.status(202).json({
          message: 'Summary not ready yet',
          status: meeting.status
        });
        return;
      }

      const response: SummaryResponse = {
        meetingId,
        summary: meeting.summary,
        status: meeting.status
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a meeting and cleanup files
   */
  deleteMeeting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { meetingId } = req.params;
      
      if (!meetingId) {
        res.status(400).json({
          error: 'INVALID_MEETING_ID',
          message: 'Meeting ID is required',
          statusCode: 400
        });
        return;
      }
      
      const meeting = this.meetings[meetingId];
      if (!meeting) {
        res.status(404).json({
          error: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
          statusCode: 404
        });
        return;
      }

      // Cleanup audio files
      if (meeting.audioFile) {
        await this.audioProcessingService.cleanupFile(meeting.audioFile.path);
        if (meeting.audioFile.processedPath) {
          await this.audioProcessingService.cleanupFile(meeting.audioFile.processedPath);
        }
      }

      // Remove from memory
      delete this.meetings[meetingId];

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all meetings
   */
  getAllMeetings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meetings = Object.values(this.meetings).map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
        status: meeting.status,
        participants: meeting.participants,
        language: meeting.language,
        duration: meeting.duration
      }));

      res.json({ meetings, total: meetings.length });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate summary from transcription data (for live recordings)
   */
  generateSummaryFromTranscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transcription, language = 'id' } = req.body;

      if (!transcription || !transcription.segments || transcription.segments.length === 0) {
        res.status(400).json({
          error: 'INVALID_TRANSCRIPTION',
          message: 'No transcription segments provided',
          statusCode: 400
        });
        return;
      }

      // Convert frontend transcription format to backend format
      const segments = transcription.segments.map((segment: any) => ({
        id: segment.id,
        startTime: segment.startTime || 0,
        endTime: segment.endTime || 0,
        text: segment.content || segment.text || '',
        speaker: segment.speakerId || 'Unknown',
        confidence: segment.confidence || 0.85,
        language: language
      }));

      // Extract speakers from segments
      const speakerMap = new Map();
      segments.forEach((segment: any) => {
        if (segment.speaker) {
          if (!speakerMap.has(segment.speaker)) {
            speakerMap.set(segment.speaker, {
              id: segment.speaker,
              name: transcription.speakers?.find((s: any) => s.id === segment.speaker)?.name || segment.speaker,
              confidence: 0.85,
              segments: 0,
              totalDuration: 0
            });
          }
          const speaker = speakerMap.get(segment.speaker);
          speaker.segments++;
          speaker.totalDuration += (segment.endTime - segment.startTime);
        }
      });

      const backendTranscription = {
        id: uuidv4(),
        meetingId: `live-recording-${Date.now()}`,
        segments: segments,
        speakers: Array.from(speakerMap.values()),
        language: language,
        confidence: segments.reduce((sum: number, s: any) => sum + s.confidence, 0) / segments.length,
        duration: Math.max(...segments.map((s: any) => s.endTime)),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed' as const
      };

      // Generate summary using OpenAI
      const summary = await this.summarizationService.generateSummary(
        backendTranscription,
        language
      );

      res.json(summary);
    } catch (error) {
      console.error('Summary generation failed:', error);
      next(error);
    }
  };

  /**
   * Process audio through the complete pipeline
   */
  private async processAudioPipeline(meetingId: string): Promise<void> {
    const meeting = this.meetings[meetingId];
    if (!meeting || !meeting.audioFile) {
      throw new Error('Meeting or audio file not found');
    }

    try {
      // Step 1: Process audio file
      this.updateMeetingStatus(meetingId, 'processing');
      this.sendWebSocketUpdate(meetingId, 'processing', 10, 'Processing audio file...');

      const { processedFile, metadata } = await this.audioProcessingService.processAudioFile(meeting.audioFile);
      meeting.audioFile = processedFile;
      meeting.duration = processedFile.duration;

      // Step 2: Transcribe audio
      this.updateMeetingStatus(meetingId, 'transcribing');
      this.sendWebSocketUpdate(meetingId, 'transcribing', 30, 'Transcribing audio...');

      const transcription = await this.transcriptionService.transcribeAudio(
        processedFile.path,
        meeting.language,
        metadata
      );
      meeting.transcription = transcription;

      // Step 3: Generate summary
      this.updateMeetingStatus(meetingId, 'summarizing');
      this.sendWebSocketUpdate(meetingId, 'summarizing', 70, 'Generating summary...');

      const summary = await this.summarizationService.generateSummary(
        transcription,
        meeting.language
      );
      meeting.summary = summary;

      // Step 4: Complete
      this.updateMeetingStatus(meetingId, 'completed');
      this.sendWebSocketUpdate(meetingId, 'completed', 100, 'Processing completed successfully!');

    } catch (error) {
      console.error(`Processing pipeline failed for meeting ${meetingId}:`, error);
      this.updateMeetingStatus(meetingId, 'failed');
      this.sendWebSocketUpdate(meetingId, 'failed', 0, 'Processing failed. Please try again.');
      throw error;
    }
  }

  /**
   * Update meeting status and timestamp
   */
  private updateMeetingStatus(meetingId: string, status: Meeting['status']): void {
    const meeting = this.meetings[meetingId];
    if (meeting) {
      meeting.status = status;
      meeting.updatedAt = new Date();
    }
  }

  /**
   * Send WebSocket update to clients
   */
  private sendWebSocketUpdate(
    meetingId: string, 
    status: Meeting['status'], 
    progress: number, 
    message: string
  ): void {
    const wsMessage: ProcessingStatusMessage = {
      type: 'processing_status',
      meetingId,
      timestamp: new Date(),
      payload: {
        status,
        progress,
        message
      }
    };

    this.wsService.broadcast(wsMessage);
  }

  /**
   * Get meeting by ID (internal method)
   */
  getMeetingById(meetingId: string): Meeting | undefined {
    return this.meetings[meetingId];
  }

  /**
   * Update meeting (internal method)
   */
  updateMeeting(meetingId: string, updates: Partial<Meeting>): void {
    const meeting = this.meetings[meetingId];
    if (meeting) {
      Object.assign(meeting, updates);
      meeting.updatedAt = new Date();
    }
  }
}