"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = __importDefault(require("fs/promises"));
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("@/config"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class TranscriptionService {
    whisperModelPath;
    modelSize;
    constructor() {
        this.whisperModelPath = config_1.default.whisper.modelPath;
        this.modelSize = config_1.default.whisper.modelSize;
    }
    async transcribeAudio(audioFilePath, language = 'id', metadata) {
        try {
            const startTime = Date.now();
            const transcriptionId = (0, uuid_1.v4)();
            const segments = await this.processWithWhisper(audioFilePath, language);
            const speakers = this.extractSpeakers(segments);
            const overallConfidence = this.calculateOverallConfidence(segments);
            const duration = this.calculateDuration(segments);
            const transcription = {
                id: transcriptionId,
                meetingId: '',
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
        }
        catch (error) {
            throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async processWithWhisper(audioFilePath, language) {
        try {
            await promises_1.default.access(audioFilePath);
        }
        catch (error) {
            throw new Error(`Audio file not found: ${audioFilePath}`);
        }
        return this.getMockIndonesianTranscription();
    }
    getMockIndonesianTranscription() {
        return [
            {
                id: (0, uuid_1.v4)(),
                text: 'Selamat pagi semua, mari kita mulai rapat ini.',
                startTime: 0,
                endTime: 3.5,
                speaker: 'Budi Santoso',
                confidence: 0.95,
                language: 'id'
            },
            {
                id: (0, uuid_1.v4)(),
                text: 'Terima kasih. Hari ini kita akan membahas proposal proyek baru.',
                startTime: 4.0,
                endTime: 8.2,
                speaker: 'Siti Nurhaliza',
                confidence: 0.92,
                language: 'id'
            },
            {
                id: (0, uuid_1.v4)(),
                text: 'Baik, saya sudah menyiapkan presentasi tentang analisis pasar.',
                startTime: 8.5,
                endTime: 12.8,
                speaker: 'Ahmad Rahman',
                confidence: 0.89,
                language: 'id'
            },
            {
                id: (0, uuid_1.v4)(),
                text: 'Menurut riset yang telah dilakukan, ada peluang yang menarik di segmen millennial.',
                startTime: 13.0,
                endTime: 18.5,
                speaker: 'Ahmad Rahman',
                confidence: 0.91,
                language: 'id'
            },
            {
                id: (0, uuid_1.v4)(),
                text: 'Itu menarik. Bisakah Anda jelaskan lebih detail tentang target demografis?',
                startTime: 19.0,
                endTime: 23.8,
                speaker: 'Budi Santoso',
                confidence: 0.87,
                language: 'id'
            },
            {
                id: (0, uuid_1.v4)(),
                text: 'Tentu saja. Target utama kita adalah usia 25-35 tahun dengan pendapatan menengah ke atas.',
                startTime: 24.2,
                endTime: 30.1,
                speaker: 'Ahmad Rahman',
                confidence: 0.93,
                language: 'id'
            },
            {
                id: (0, uuid_1.v4)(),
                text: 'Berapa perkiraan budget yang dibutuhkan untuk proyek ini?',
                startTime: 30.5,
                endTime: 34.7,
                speaker: 'Siti Nurhaliza',
                confidence: 0.90,
                language: 'id'
            },
            {
                id: (0, uuid_1.v4)(),
                text: 'Estimasi awal sekitar 500 juta rupiah untuk fase pertama implementasi.',
                startTime: 35.2,
                endTime: 40.8,
                speaker: 'Ahmad Rahman',
                confidence: 0.88,
                language: 'id'
            }
        ];
    }
    async transcribeRealTime(audioChunk, language = 'id', isPartial = true) {
        try {
            if (isPartial) {
                return {
                    id: (0, uuid_1.v4)(),
                    text: '[Mendengarkan...]',
                    startTime: Date.now() / 1000,
                    endTime: (Date.now() / 1000) + 1,
                    confidence: 0.5,
                    language,
                    isPartial: true
                };
            }
            return null;
        }
        catch (error) {
            console.error('Real-time transcription error:', error);
            return null;
        }
    }
    extractSpeakers(segments) {
        const speakerMap = new Map();
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
            id: (0, uuid_1.v4)(),
            name,
            confidence: data.confidenceSum / data.segments,
            segments: data.segments,
            totalDuration: data.totalDuration
        }));
    }
    calculateOverallConfidence(segments) {
        if (segments.length === 0)
            return 0;
        const totalConfidence = segments.reduce((sum, segment) => sum + segment.confidence, 0);
        return totalConfidence / segments.length;
    }
    calculateDuration(segments) {
        if (segments.length === 0)
            return 0;
        const lastSegment = segments[segments.length - 1];
        return lastSegment.endTime;
    }
    async validateTranscription(transcription) {
        const issues = [];
        const suggestions = [];
        if (transcription.confidence < 0.7) {
            issues.push('Low overall transcription confidence');
            suggestions.push('Consider re-processing with better audio quality');
        }
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
    async postProcessTranscription(transcription) {
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
    cleanTranscriptionText(text) {
        return text
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/([.!?])\s*([a-z])/g, '$1 $2')
            .replace(/\b(um|uh|eh|hmm)\b/gi, '')
            .trim();
    }
    async exportTranscription(transcription, format) {
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
    exportToText(transcription) {
        return transcription.segments
            .map(segment => {
            const timestamp = this.formatTimestamp(segment.startTime);
            const speaker = segment.speaker ? `[${segment.speaker}] ` : '';
            return `${timestamp} ${speaker}${segment.text}`;
        })
            .join('\n');
    }
    exportToSRT(transcription) {
        return transcription.segments
            .map((segment, index) => {
            const startTime = this.formatSRTTimestamp(segment.startTime);
            const endTime = this.formatSRTTimestamp(segment.endTime);
            const speaker = segment.speaker ? `<font color="#00ff00">${segment.speaker}:</font> ` : '';
            return `${index + 1}\n${startTime} --> ${endTime}\n${speaker}${segment.text}\n`;
        })
            .join('\n');
    }
    exportToVTT(transcription) {
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
    formatTimestamp(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    formatSRTTimestamp(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
    }
    formatVTTTimestamp(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
}
exports.TranscriptionService = TranscriptionService;
//# sourceMappingURL=transcriptionService.js.map