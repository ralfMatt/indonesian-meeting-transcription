import { AudioProcessingService } from '@/services/audioProcessingService';
import { AudioFile } from '@/types';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('fluent-ffmpeg');

describe('AudioProcessingService', () => {
  let audioProcessingService: AudioProcessingService;
  let mockAudioFile: AudioFile;

  beforeEach(() => {
    audioProcessingService = new AudioProcessingService();
    
    mockAudioFile = {
      id: 'audio-123',
      originalName: 'test-meeting.mp3',
      filename: 'test-audio-123.mp3',
      path: './uploads/audio/test-audio-123.mp3',
      mimetype: 'audio/mpeg',
      size: 1024 * 1024, // 1MB
      uploadedAt: new Date('2024-01-01T10:00:00Z')
    };

    // Mock fs operations
    (fs.stat as jest.Mock).mockResolvedValue({ size: 1024 * 1024 });
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);

    // Mock ffmpeg operations
    const mockFfmpegCommand = {
      audioCodec: jest.fn().mockReturnThis(),
      audioFrequency: jest.fn().mockReturnThis(),
      audioChannels: jest.fn().mockReturnThis(),
      format: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'end') {
          setTimeout(callback, 10);
        }
        return mockFfmpegCommand;
      }),
      save: jest.fn().mockReturnThis()
    };

    (ffmpeg as unknown as jest.Mock).mockReturnValue(mockFfmpegCommand);
    
    // Mock ffprobe
    (ffmpeg.ffprobe as jest.Mock).mockImplementation((filePath, callback) => {
      callback(null, {
        format: { duration: 180.5 },
        streams: [{
          codec_type: 'audio',
          sample_rate: 44100,
          channels: 2
        }]
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processAudioFile', () => {
    it('should successfully process audio file', async () => {
      const result = await audioProcessingService.processAudioFile(mockAudioFile);

      expect(result.processedFile).toBeDefined();
      expect(result.processedFile.mimetype).toBe('audio/wav');
      expect(result.processedFile.duration).toBe(180.5);
      expect(result.processedFile.sampleRate).toBe(44100);
      expect(result.processedFile.channels).toBe(2);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.whisperModel).toBe('base');
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.audioPreprocessing?.normalizedVolume).toBe(true);
      expect(result.metadata.audioPreprocessing?.noiseReduction).toBe(true);
    });

    it('should handle ffmpeg conversion errors', async () => {
      const mockFfmpegCommand = {
        audioCodec: jest.fn().mockReturnThis(),
        audioFrequency: jest.fn().mockReturnThis(),
        audioChannels: jest.fn().mockReturnThis(),
        format: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('FFmpeg conversion failed')), 10);
          }
          return mockFfmpegCommand;
        }),
        save: jest.fn().mockReturnThis()
      };

      (ffmpeg as unknown as jest.Mock).mockReturnValue(mockFfmpegCommand);

      await expect(audioProcessingService.processAudioFile(mockAudioFile))
        .rejects.toThrow('Audio processing failed');
    });

    it('should handle file system errors', async () => {
      (fs.stat as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(audioProcessingService.processAudioFile(mockAudioFile))
        .rejects.toThrow('Audio processing failed');
    });
  });

  describe('validateAudioFile', () => {
    let mockMulterFile: Express.Multer.File;

    beforeEach(() => {
      mockMulterFile = {
        fieldname: 'audio',
        originalname: 'test-meeting.mp3',
        encoding: '7bit',
        mimetype: 'audio/mpeg',
        size: 1024 * 1024, // 1MB
        destination: './uploads/audio',
        filename: 'test-audio-123.mp3',
        path: './uploads/audio/test-audio-123.mp3',
        buffer: Buffer.from('mock audio data')
      };
    });

    it('should validate correct audio file', async () => {
      const isValid = await audioProcessingService.validateAudioFile(mockMulterFile);
      expect(isValid).toBe(true);
    });

    it('should reject files that are too large', async () => {
      mockMulterFile.size = 200 * 1024 * 1024; // 200MB (exceeds 100MB limit)

      await expect(audioProcessingService.validateAudioFile(mockMulterFile))
        .rejects.toThrow('File too large');
    });

    it('should reject unsupported file formats', async () => {
      mockMulterFile.mimetype = 'video/mp4';

      await expect(audioProcessingService.validateAudioFile(mockMulterFile))
        .rejects.toThrow('Unsupported audio format');
    });

    it('should reject corrupted audio files', async () => {
      (ffmpeg.ffprobe as jest.Mock).mockImplementation((filePath, callback) => {
        callback(new Error('Invalid audio file'), null);
      });

      await expect(audioProcessingService.validateAudioFile(mockMulterFile))
        .rejects.toThrow('Invalid audio file or corrupted data');
    });

    it('should reject files without audio streams', async () => {
      (ffmpeg.ffprobe as jest.Mock).mockImplementation((filePath, callback) => {
        callback(null, {
          format: { duration: 180.5 },
          streams: [{
            codec_type: 'video' // No audio stream
          }]
        });
      });

      await expect(audioProcessingService.validateAudioFile(mockMulterFile))
        .rejects.toThrow('Invalid audio file or corrupted data');
    });
  });

  describe('cleanupFile', () => {
    it('should successfully remove file', async () => {
      await audioProcessingService.cleanupFile('/path/to/file.mp3');
      expect(fs.unlink).toHaveBeenCalledWith('/path/to/file.mp3');
    });

    it('should handle file removal errors gracefully', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('File not found'));
      
      // Should not throw error
      await expect(audioProcessingService.cleanupFile('/path/to/file.mp3'))
        .resolves.toBeUndefined();
    });
  });

  describe('cleanupOldFiles', () => {
    beforeEach(() => {
      const oldDate = new Date('2024-01-01T10:00:00Z');
      const recentDate = new Date('2024-01-03T10:00:00Z');

      // Mock current time to be January 3rd
      jest.spyOn(Date, 'now').mockReturnValue(recentDate.getTime());

      (fs.readdir as jest.Mock).mockImplementation((dirPath) => {
        if (dirPath.includes('audio')) {
          return Promise.resolve(['old-file.mp3', 'recent-file.mp3']);
        }
        return Promise.resolve([]);
      });

      (fs.stat as jest.Mock).mockImplementation((filePath) => {
        if (filePath.includes('old-file')) {
          return Promise.resolve({ mtime: oldDate });
        }
        return Promise.resolve({ mtime: recentDate });
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should clean up old files', async () => {
      await audioProcessingService.cleanupOldFiles();

      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('old-file.mp3')
      );
      expect(fs.unlink).not.toHaveBeenCalledWith(
        expect.stringContaining('recent-file.mp3')
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Directory not found'));

      // Should not throw error
      await expect(audioProcessingService.cleanupOldFiles())
        .resolves.toBeUndefined();
    });
  });

  describe('getProcessingProgress', () => {
    it('should estimate low complexity for small files', () => {
      const progress = audioProcessingService.getProcessingProgress(5 * 1024 * 1024); // 5MB
      
      expect(progress.complexity).toBe('low');
      expect(progress.estimatedTimeSeconds).toBe(30);
    });

    it('should estimate medium complexity for medium files', () => {
      const progress = audioProcessingService.getProcessingProgress(25 * 1024 * 1024); // 25MB
      
      expect(progress.complexity).toBe('medium');
      expect(progress.estimatedTimeSeconds).toBe(120);
    });

    it('should estimate high complexity for large files', () => {
      const progress = audioProcessingService.getProcessingProgress(75 * 1024 * 1024); // 75MB
      
      expect(progress.complexity).toBe('high');
      expect(progress.estimatedTimeSeconds).toBe(300);
    });
  });
});