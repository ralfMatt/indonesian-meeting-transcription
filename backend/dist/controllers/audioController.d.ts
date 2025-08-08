import { Request, Response, NextFunction } from 'express';
import { WebSocketService } from '@/services/websocketService';
import { Meeting } from '@/types';
export declare class AudioController {
    private meetings;
    private audioProcessingService;
    private transcriptionService;
    private summarizationService;
    private wsService;
    constructor(wsService: WebSocketService);
    uploadAudio: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMeeting: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTranscription: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getSummary: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteMeeting: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllMeetings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    generateSummaryFromTranscription: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    private processAudioPipeline;
    private updateMeetingStatus;
    private sendWebSocketUpdate;
    getMeetingById(meetingId: string): Meeting | undefined;
    updateMeeting(meetingId: string, updates: Partial<Meeting>): void;
}
//# sourceMappingURL=audioController.d.ts.map