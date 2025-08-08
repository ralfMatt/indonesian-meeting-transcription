import { Transcription, TranscriptionSegment, ProcessingMetadata } from '@/types';
export declare class TranscriptionService {
    private readonly whisperModelPath;
    private readonly modelSize;
    constructor();
    transcribeAudio(audioFilePath: string, language?: string, metadata?: ProcessingMetadata): Promise<Transcription>;
    private processWithWhisper;
    private getMockIndonesianTranscription;
    transcribeRealTime(audioChunk: Buffer, language?: string, isPartial?: boolean): Promise<TranscriptionSegment | null>;
    private extractSpeakers;
    private calculateOverallConfidence;
    private calculateDuration;
    validateTranscription(transcription: Transcription): Promise<{
        isValid: boolean;
        issues: string[];
        suggestions: string[];
    }>;
    postProcessTranscription(transcription: Transcription): Promise<Transcription>;
    private cleanTranscriptionText;
    exportTranscription(transcription: Transcription, format: 'txt' | 'srt' | 'vtt' | 'json'): Promise<string>;
    private exportToText;
    private exportToSRT;
    private exportToVTT;
    private formatTimestamp;
    private formatSRTTimestamp;
    private formatVTTTimestamp;
}
//# sourceMappingURL=transcriptionService.d.ts.map