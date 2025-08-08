import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  Transcription, 
  TranscriptionSegment, 
  Speaker, 
  ProcessingMetadata 
} from '@/types';
import config from '@/config';

const execAsync = promisify(exec);

export class TranscriptionService {
  private readonly whisperModelPath: string;
  private readonly modelSize: string;

  constructor() {
    this.whisperModelPath = config.whisper.modelPath;
    this.modelSize = config.whisper.modelSize;
  }

  /**
   * Transcribe audio file using Whisper
   * This is a simplified implementation - in production, you'd use the actual Whisper Python API
   */
  async transcribeAudio(
    audioFilePath: string,
    language: string = 'id',
    metadata?: ProcessingMetadata
  ): Promise<Transcription> {
    try {
      const startTime = Date.now();
      const transcriptionId = uuidv4();

      // For now, we'll simulate Whisper transcription
      // In production, you would call the actual Whisper model
      const segments = await this.processWithWhisper(audioFilePath, language);
      
      // Extract speakers from segments
      const speakers = this.extractSpeakers(segments);
      
      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(segments);
      
      // Get audio duration from metadata or estimate from segments
      const duration = this.calculateDuration(segments);

      const transcription: Transcription = {
        id: transcriptionId,
        meetingId: '', // Will be set by the controller
        segments,
        speakers,
        language,
        confidence: overallConfidence,
        duration,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed',
        processingMetadata: {
          ...metadata,
          whisperModel: this.modelSize,
          processingTime: Date.now() - startTime
        }
      };

      return transcription;
    } catch (error) {
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process audio with Whisper model (simulated for now)
   * In production, this would interface with the actual Whisper Python API
   */
  private async processWithWhisper(
    audioFilePath: string,
    language: string
  ): Promise<TranscriptionSegment[]> {
    // Check if audio file exists
    try {
      await fs.access(audioFilePath);
    } catch (error) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    // For now, return mock data that simulates Indonesian transcription
    // In production, this would call the actual Whisper API
    return this.getMockIndonesianTranscription();
  }

  /**
   * Mock Indonesian transcription data for development/testing
   * Replace this with actual Whisper API calls in production
   */
  private getMockIndonesianTranscription(): TranscriptionSegment[] {
    return [
      {
        id: uuidv4(),
        text: 'Selamat pagi semua, mari kita mulai rapat ini.',
        startTime: 0,
        endTime: 3.5,
        speaker: 'Budi Santoso',
        confidence: 0.95,
        language: 'id'
      },
      {
        id: uuidv4(),
        text: 'Terima kasih. Hari ini kita akan membahas proposal proyek baru.',
        startTime: 4.0,
        endTime: 8.2,
        speaker: 'Siti Nurhaliza',
        confidence: 0.92,
        language: 'id'
      },
      {
        id: uuidv4(),
        text: 'Baik, saya sudah menyiapkan presentasi tentang analisis pasar.',
        startTime: 8.5,
        endTime: 12.8,
        speaker: 'Ahmad Rahman',
        confidence: 0.89,
        language: 'id'
      },
      {
        id: uuidv4(),
        text: 'Menurut riset yang telah dilakukan, ada peluang yang menarik di segmen millennial.',
        startTime: 13.0,
        endTime: 18.5,
        speaker: 'Ahmad Rahman',
        confidence: 0.91,
        language: 'id'
      },
      {
        id: uuidv4(),
        text: 'Itu menarik. Bisakah Anda jelaskan lebih detail tentang target demografis?',
        startTime: 19.0,
        endTime: 23.8,
        speaker: 'Budi Santoso',
        confidence: 0.87,
        language: 'id'
      },
      {
        id: uuidv4(),
        text: 'Tentu saja. Target utama kita adalah usia 25-35 tahun dengan pendapatan menengah ke atas.',
        startTime: 24.2,
        endTime: 30.1,
        speaker: 'Ahmad Rahman',
        confidence: 0.93,
        language: 'id'
      },
      {
        id: uuidv4(),
        text: 'Berapa perkiraan budget yang dibutuhkan untuk proyek ini?',
        startTime: 30.5,
        endTime: 34.7,
        speaker: 'Siti Nurhaliza',
        confidence: 0.90,
        language: 'id'
      },
      {
        id: uuidv4(),
        text: 'Estimasi awal sekitar 500 juta rupiah untuk fase pertama implementasi.',
        startTime: 35.2,
        endTime: 40.8,
        speaker: 'Ahmad Rahman',
        confidence: 0.88,
        language: 'id'
      }
    ];
  }

  /**
   * Real-time transcription for live audio streams
   * This would be used with WebSocket connections
   */
  async transcribeRealTime(
    audioChunk: Buffer,
    language: string = 'id',
    isPartial: boolean = true
  ): Promise<TranscriptionSegment | null> {
    try {
      // In production, this would process audio chunks in real-time
      // For now, return a mock partial segment
      if (isPartial) {
        return {
          id: uuidv4(),
          text: '[Mendengarkan...]', // Placeholder for partial transcription
          startTime: Date.now() / 1000,
          endTime: (Date.now() / 1000) + 1,
          confidence: 0.5,
          language,
          isPartial: true
        };
      }

      // Return null for now - in production, this would return the completed segment
      return null;
    } catch (error) {
      console.error('Real-time transcription error:', error);
      return null;
    }
  }

  /**
   * Extract unique speakers from transcription segments
   */
  private extractSpeakers(segments: TranscriptionSegment[]): Speaker[] {
    const speakerMap = new Map<string, {
      segments: number;
      totalDuration: number;
      confidenceSum: number;
    }>();

    segments.forEach(segment => {
      if (segment.speaker) {
        const existing = speakerMap.get(segment.speaker) || {
          segments: 0,
          totalDuration: 0,
          confidenceSum: 0
        };

        existing.segments++;
        existing.totalDuration += (segment.endTime - segment.startTime);
        existing.confidenceSum += segment.confidence;

        speakerMap.set(segment.speaker, existing);
      }
    });

    return Array.from(speakerMap.entries()).map(([name, data]) => ({
      id: uuidv4(),
      name,
      confidence: data.confidenceSum / data.segments,
      segments: data.segments,
      totalDuration: data.totalDuration
    }));
  }

  /**
   * Calculate overall transcription confidence
   */
  private calculateOverallConfidence(segments: TranscriptionSegment[]): number {
    if (segments.length === 0) return 0;
    
    const totalConfidence = segments.reduce((sum, segment) => sum + segment.confidence, 0);
    return totalConfidence / segments.length;
  }

  /**
   * Calculate total duration from segments
   */
  private calculateDuration(segments: TranscriptionSegment[]): number {
    if (segments.length === 0) return 0;
    
    const lastSegment = segments[segments.length - 1];
    return lastSegment.endTime;
  }

  /**
   * Validate transcription quality and accuracy
   */
  async validateTranscription(transcription: Transcription): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check overall confidence
    if (transcription.confidence < 0.7) {
      issues.push('Low overall transcription confidence');
      suggestions.push('Consider re-processing with better audio quality');
    }

    // Check for very short or very long segments
    transcription.segments.forEach((segment, index) => {
      const duration = segment.endTime - segment.startTime;
      
      if (duration < 0.5) {
        issues.push(`Segment ${index + 1} is very short (${duration.toFixed(1)}s)`);
      }
      
      if (duration > 30) {
        issues.push(`Segment ${index + 1} is very long (${duration.toFixed(1)}s)`);
        suggestions.push('Consider splitting long segments for better readability');
      }

      if (segment.confidence < 0.6) {
        issues.push(`Segment ${index + 1} has low confidence (${(segment.confidence * 100).toFixed(1)}%)`);
      }
    });

    // Check for speaker consistency
    const speakers = transcription.speakers;
    if (speakers.length === 0) {
      suggestions.push('No speakers detected - consider enabling speaker diarization');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Post-process transcription for better readability
   */
  async postProcessTranscription(transcription: Transcription): Promise<Transcription> {
    const processedSegments = transcription.segments.map(segment => ({
      ...segment,
      text: this.cleanTranscriptionText(segment.text)
    }));

    return {
      ...transcription,
      segments: processedSegments,
      updatedAt: new Date()
    };
  }

  /**
   * Clean and format transcription text
   */
  private cleanTranscriptionText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Fix punctuation spacing
      .replace(/\b(um|uh|eh|hmm)\b/gi, '') // Remove filler words
      .trim();
  }

  /**
   * Export transcription to various formats
   */
  async exportTranscription(
    transcription: Transcription,
    format: 'txt' | 'srt' | 'vtt' | 'json'
  ): Promise<string> {
    switch (format) {
      case 'txt':
        return this.exportToText(transcription);
      case 'srt':
        return this.exportToSRT(transcription);
      case 'vtt':
        return this.exportToVTT(transcription);
      case 'json':
        return JSON.stringify(transcription, null, 2);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to plain text format
   */
  private exportToText(transcription: Transcription): string {
    return transcription.segments
      .map(segment => {
        const timestamp = this.formatTimestamp(segment.startTime);
        const speaker = segment.speaker ? `[${segment.speaker}] ` : '';
        return `${timestamp} ${speaker}${segment.text}`;
      })
      .join('\n');
  }

  /**
   * Export to SRT subtitle format
   */
  private exportToSRT(transcription: Transcription): string {
    return transcription.segments
      .map((segment, index) => {
        const startTime = this.formatSRTTimestamp(segment.startTime);
        const endTime = this.formatSRTTimestamp(segment.endTime);
        const speaker = segment.speaker ? `<font color="#00ff00">${segment.speaker}:</font> ` : '';
        
        return `${index + 1}\n${startTime} --> ${endTime}\n${speaker}${segment.text}\n`;
      })
      .join('\n');
  }

  /**
   * Export to WebVTT format
   */
  private exportToVTT(transcription: Transcription): string {
    const header = 'WEBVTT\n\n';
    const content = transcription.segments
      .map(segment => {
        const startTime = this.formatVTTTimestamp(segment.startTime);
        const endTime = this.formatVTTTimestamp(segment.endTime);
        const speaker = segment.speaker ? `<v ${segment.speaker}>` : '';
        
        return `${startTime} --> ${endTime}\n${speaker}${segment.text}\n`;
      })
      .join('\n');
    
    return header + content;
  }

  /**
   * Format timestamp for display (HH:MM:SS)
   */
  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format timestamp for SRT format (HH:MM:SS,mmm)
   */
  private formatSRTTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Format timestamp for VTT format (HH:MM:SS.mmm)
   */
  private formatVTTTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
}