"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioController = void 0;
const uuid_1 = require("uuid");
const audioProcessingService_1 = require("@/services/audioProcessingService");
const transcriptionService_1 = require("@/services/transcriptionService");
const summarizationService_1 = require("@/services/summarizationService");
class AudioController {
    meetings = {};
    audioProcessingService;
    transcriptionService;
    summarizationService;
    wsService;
    constructor(wsService) {
        this.audioProcessingService = new audioProcessingService_1.AudioProcessingService();
        this.transcriptionService = new transcriptionService_1.TranscriptionService();
        this.summarizationService = new summarizationService_1.SummarizationService();
        this.wsService = wsService;
    }
    uploadAudio = async (req, res, next) => {
        try {
            if (!req.file) {
                res.status(400).json({
                    error: 'AUDIO_UPLOAD_FAILED',
                    message: 'No audio file provided',
                    statusCode: 400
                });
                return;
            }
            const body = req.body;
            const meetingId = (0, uuid_1.v4)();
            await this.audioProcessingService.validateAudioFile(req.file);
            const audioFile = {
                id: (0, uuid_1.v4)(),
                originalName: req.file.originalname,
                filename: req.file.filename,
                path: req.file.path,
                mimetype: req.file.mimetype,
                size: req.file.size,
                uploadedAt: new Date()
            };
            const meeting = {
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
            const progress = this.audioProcessingService.getProcessingProgress(req.file.size);
            const response = {
                meetingId,
                message: 'Audio file uploaded successfully. Processing started.',
                status: 'processing',
                estimatedProcessingTime: progress.estimatedTimeSeconds
            };
            res.status(201).json(response);
            this.processAudioPipeline(meetingId).catch(error => {
                console.error(`Processing failed for meeting ${meetingId}:`, error);
                this.updateMeetingStatus(meetingId, 'failed');
            });
        }
        catch (error) {
            next(error);
        }
    };
    getMeeting = async (req, res, next) => {
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
            const response = {
                meeting,
                transcription: meeting.transcription,
                summary: meeting.summary
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getTranscription = async (req, res, next) => {
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
            const response = {
                meetingId,
                transcription: meeting.transcription,
                status: meeting.status
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getSummary = async (req, res, next) => {
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
            const response = {
                meetingId,
                summary: meeting.summary,
                status: meeting.status
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    };
    deleteMeeting = async (req, res, next) => {
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
            if (meeting.audioFile) {
                await this.audioProcessingService.cleanupFile(meeting.audioFile.path);
                if (meeting.audioFile.processedPath) {
                    await this.audioProcessingService.cleanupFile(meeting.audioFile.processedPath);
                }
            }
            delete this.meetings[meetingId];
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    };
    getAllMeetings = async (req, res, next) => {
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
        }
        catch (error) {
            next(error);
        }
    };
    generateSummaryFromTranscription = async (req, res, next) => {
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
            const segments = transcription.segments.map((segment) => ({
                id: segment.id,
                startTime: segment.startTime || 0,
                endTime: segment.endTime || 0,
                text: segment.content || segment.text || '',
                speaker: segment.speakerId || 'Unknown',
                confidence: segment.confidence || 0.85,
                language: language
            }));
            const speakerMap = new Map();
            segments.forEach((segment) => {
                if (segment.speaker) {
                    if (!speakerMap.has(segment.speaker)) {
                        speakerMap.set(segment.speaker, {
                            id: segment.speaker,
                            name: transcription.speakers?.find((s) => s.id === segment.speaker)?.name || segment.speaker,
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
                id: (0, uuid_1.v4)(),
                meetingId: `live-recording-${Date.now()}`,
                segments: segments,
                speakers: Array.from(speakerMap.values()),
                language: language,
                confidence: segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length,
                duration: Math.max(...segments.map((s) => s.endTime)),
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'completed'
            };
            const summary = await this.summarizationService.generateSummary(backendTranscription, language);
            res.json(summary);
        }
        catch (error) {
            console.error('Summary generation failed:', error);
            next(error);
        }
    };
    async processAudioPipeline(meetingId) {
        const meeting = this.meetings[meetingId];
        if (!meeting || !meeting.audioFile) {
            throw new Error('Meeting or audio file not found');
        }
        try {
            this.updateMeetingStatus(meetingId, 'processing');
            this.sendWebSocketUpdate(meetingId, 'processing', 10, 'Processing audio file...');
            const { processedFile, metadata } = await this.audioProcessingService.processAudioFile(meeting.audioFile);
            meeting.audioFile = processedFile;
            meeting.duration = processedFile.duration;
            this.updateMeetingStatus(meetingId, 'transcribing');
            this.sendWebSocketUpdate(meetingId, 'transcribing', 30, 'Transcribing audio...');
            const transcription = await this.transcriptionService.transcribeAudio(processedFile.path, meeting.language, metadata);
            meeting.transcription = transcription;
            this.updateMeetingStatus(meetingId, 'summarizing');
            this.sendWebSocketUpdate(meetingId, 'summarizing', 70, 'Generating summary...');
            const summary = await this.summarizationService.generateSummary(transcription, meeting.language);
            meeting.summary = summary;
            this.updateMeetingStatus(meetingId, 'completed');
            this.sendWebSocketUpdate(meetingId, 'completed', 100, 'Processing completed successfully!');
        }
        catch (error) {
            console.error(`Processing pipeline failed for meeting ${meetingId}:`, error);
            this.updateMeetingStatus(meetingId, 'failed');
            this.sendWebSocketUpdate(meetingId, 'failed', 0, 'Processing failed. Please try again.');
            throw error;
        }
    }
    updateMeetingStatus(meetingId, status) {
        const meeting = this.meetings[meetingId];
        if (meeting) {
            meeting.status = status;
            meeting.updatedAt = new Date();
        }
    }
    sendWebSocketUpdate(meetingId, status, progress, message) {
        const wsMessage = {
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
    getMeetingById(meetingId) {
        return this.meetings[meetingId];
    }
    updateMeeting(meetingId, updates) {
        const meeting = this.meetings[meetingId];
        if (meeting) {
            Object.assign(meeting, updates);
            meeting.updatedAt = new Date();
        }
    }
}
exports.AudioController = AudioController;
//# sourceMappingURL=audioController.js.map