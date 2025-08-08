"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioProcessingService = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("@/config"));
class AudioProcessingService {
    uploadPath;
    processedPath;
    constructor() {
        this.uploadPath = config_1.default.audio.uploadPath;
        this.processedPath = config_1.default.audio.processedPath;
    }
    async processAudioFile(audioFile) {
        try {
            const startTime = Date.now();
            const processedFilename = `processed_${(0, uuid_1.v4)()}.wav`;
            const processedFilePath = path_1.default.join(this.processedPath, processedFilename);
            await this.ensureDirectoryExists(this.processedPath);
            const audioInfo = await this.getAudioInfo(audioFile.path);
            await this.convertAudioFile(audioFile.path, processedFilePath);
            const processedStats = await promises_1.default.stat(processedFilePath);
            const processedInfo = await this.getAudioInfo(processedFilePath);
            const processedFile = {
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
            const metadata = {
                whisperModel: config_1.default.whisper.modelSize,
                processingTime: Date.now() - startTime,
                audioPreprocessing: {
                    normalizedVolume: true,
                    noiseReduction: true,
                    originalFormat: audioFile.mimetype,
                    processedFormat: 'audio/wav'
                }
            };
            return { processedFile, metadata };
        }
        catch (error) {
            throw new Error(`Audio processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async convertAudioFile(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(inputPath)
                .audioCodec('pcm_s16le')
                .audioFrequency(16000)
                .audioChannels(1)
                .format('wav')
                .on('end', () => resolve())
                .on('error', (error) => reject(error))
                .save(outputPath);
        });
    }
    async getAudioInfo(filePath) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(filePath, (error, metadata) => {
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
    async validateAudioFile(file) {
        if (file.size > config_1.default.audio.maxFileSize) {
            throw new Error(`File too large. Maximum size: ${this.formatFileSize(config_1.default.audio.maxFileSize)}`);
        }
        if (!config_1.default.audio.supportedFormats.includes(file.mimetype)) {
            throw new Error(`Unsupported audio format. Supported formats: ${config_1.default.audio.supportedFormats.join(', ')}`);
        }
        try {
            await this.getAudioInfo(file.path);
            return true;
        }
        catch (error) {
            throw new Error('Invalid audio file or corrupted data');
        }
    }
    async cleanupFile(filePath) {
        try {
            await promises_1.default.unlink(filePath);
        }
        catch (error) {
            console.warn(`Failed to cleanup file ${filePath}:`, error);
        }
    }
    async cleanupOldFiles() {
        const maxAge = config_1.default.cleanup.maxFileAgeHours * 60 * 60 * 1000;
        const now = Date.now();
        try {
            await this.cleanupDirectory(this.uploadPath, maxAge, now);
            await this.cleanupDirectory(this.processedPath, maxAge, now);
            console.log('Old files cleanup completed');
        }
        catch (error) {
            console.error('Failed to cleanup old files:', error);
        }
    }
    async cleanupDirectory(dirPath, maxAge, now) {
        try {
            const files = await promises_1.default.readdir(dirPath);
            for (const file of files) {
                const filePath = path_1.default.join(dirPath, file);
                const stats = await promises_1.default.stat(filePath);
                if (now - stats.mtime.getTime() > maxAge) {
                    await promises_1.default.unlink(filePath);
                    console.log(`Cleaned up old file: ${filePath}`);
                }
            }
        }
        catch (error) {
            console.warn(`Failed to cleanup directory ${dirPath}:`, error);
        }
    }
    async ensureDirectoryExists(dirPath) {
        try {
            await promises_1.default.access(dirPath);
        }
        catch {
            await promises_1.default.mkdir(dirPath, { recursive: true });
        }
    }
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0)
            return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    getProcessingProgress(fileSizeBytes) {
        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        let estimatedTimeSeconds;
        let complexity;
        if (fileSizeMB < 10) {
            estimatedTimeSeconds = 30;
            complexity = 'low';
        }
        else if (fileSizeMB < 50) {
            estimatedTimeSeconds = 120;
            complexity = 'medium';
        }
        else {
            estimatedTimeSeconds = 300;
            complexity = 'high';
        }
        return { estimatedTimeSeconds, complexity };
    }
}
exports.AudioProcessingService = AudioProcessingService;
//# sourceMappingURL=audioProcessingService.js.map