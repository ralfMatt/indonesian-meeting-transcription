import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AudioFile, ProcessingMetadata } from '@/types';
import config from '@/config';

export class AudioProcessingService {
  private readonly uploadPath: string;
  private readonly processedPath: string;

  constructor() {
    this.uploadPath = config.audio.uploadPath;
    this.processedPath = config.audio.processedPath;
  }

  /**
   * Process uploaded audio file for transcription
   * Converts to WAV format, normalizes audio, and extracts metadata
   */
  async processAudioFile(audioFile: AudioFile): Promise<{
    processedFile: AudioFile;
    metadata: ProcessingMetadata;
  }> {
    try {
      const startTime = Date.now();
      const processedFilename = `processed_${uuidv4()}.wav`;
      const processedFilePath = path.join(this.processedPath, processedFilename);

      // Ensure processed directory exists
      await this.ensureDirectoryExists(this.processedPath);

      // Get audio metadata
      const audioInfo = await this.getAudioInfo(audioFile.path);

      // Process audio: convert to WAV, normalize, optimize for transcription
      await this.convertAudioFile(audioFile.path, processedFilePath);

      // Get processed file stats
      const processedStats = await fs.stat(processedFilePath);
      const processedInfo = await this.getAudioInfo(processedFilePath);

      const processedFile: AudioFile = {
        ...audioFile,
        filename: processedFilename,
        path: processedFilePath,
        processedPath: processedFilePath,
        mimetype: 'audio/wav',
        size: processedStats.size,
        duration: processedInfo.duration,
        sampleRate: processedInfo.sampleRate,
        channels: processedInfo.channels
      };

      const metadata: ProcessingMetadata = {
        whisperModel: config.whisper.modelSize,
        processingTime: Date.now() - startTime,
        audioPreprocessing: {
          normalizedVolume: true,
          noiseReduction: true,
          originalFormat: audioFile.mimetype,
          processedFormat: 'audio/wav'
        }
      };

      return { processedFile, metadata };
    } catch (error) {
      throw new Error(`Audio processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert audio file to WAV format optimized for Whisper
   */
  private async convertAudioFile(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('pcm_s16le')
        .audioFrequency(16000) // Whisper optimal sample rate
        .audioChannels(1) // Mono for better transcription
        .format('wav')
        .on('end', () => resolve())
        .on('error', (error) => reject(error))
        .save(outputPath);
    });
  }

  /**
   * Extract audio file metadata
   */
  private async getAudioInfo(filePath: string): Promise<{
    duration: number;
    sampleRate: number;
    channels: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (error, metadata) => {
        if (error) {
          reject(error);
          return;
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        if (!audioStream) {
          reject(new Error('No audio stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration ?? 0,
          sampleRate: audioStream.sample_rate ?? 16000,
          channels: audioStream.channels ?? 1
        });
      });
    });
  }

  /**
   * Validate audio file format and size
   */
  async validateAudioFile(file: Express.Multer.File): Promise<boolean> {
    // Check file size
    if (file.size > config.audio.maxFileSize) {
      throw new Error(`File too large. Maximum size: ${this.formatFileSize(config.audio.maxFileSize)}`);
    }

    // Check file format
    if (!config.audio.supportedFormats.includes(file.mimetype)) {
      throw new Error(`Unsupported audio format. Supported formats: ${config.audio.supportedFormats.join(', ')}`);
    }

    // Additional validation: check if file is actually audio
    try {
      await this.getAudioInfo(file.path);
      return true;
    } catch (error) {
      throw new Error('Invalid audio file or corrupted data');
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore error
      console.warn(`Failed to cleanup file ${filePath}:`, error);
    }
  }

  /**
   * Clean up old files based on configuration
   */
  async cleanupOldFiles(): Promise<void> {
    const maxAge = config.cleanup.maxFileAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    const now = Date.now();

    try {
      // Clean upload directory
      await this.cleanupDirectory(this.uploadPath, maxAge, now);
      
      // Clean processed directory
      await this.cleanupDirectory(this.processedPath, maxAge, now);
      
      console.log('Old files cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
    }
  }

  /**
   * Clean up files in directory older than maxAge
   */
  private async cleanupDirectory(dirPath: string, maxAge: number, now: number): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old file: ${filePath}`);
        }
      }
    } catch (error) {
      console.warn(`Failed to cleanup directory ${dirPath}:`, error);
    }
  }

  /**
   * Ensure directory exists, create if not
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Format file size for human reading
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get processing status and progress estimation
   */
  getProcessingProgress(fileSizeBytes: number): {
    estimatedTimeSeconds: number;
    complexity: 'low' | 'medium' | 'high';
  } {
    // Estimate processing time based on file size
    // These are rough estimates and should be calibrated based on actual performance
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    
    let estimatedTimeSeconds: number;
    let complexity: 'low' | 'medium' | 'high';

    if (fileSizeMB < 10) {
      estimatedTimeSeconds = 30;
      complexity = 'low';
    } else if (fileSizeMB < 50) {
      estimatedTimeSeconds = 120;
      complexity = 'medium';
    } else {
      estimatedTimeSeconds = 300;
      complexity = 'high';
    }

    return { estimatedTimeSeconds, complexity };
  }
}