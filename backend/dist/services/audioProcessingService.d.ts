import { AudioFile, ProcessingMetadata } from '@/types';
export declare class AudioProcessingService {
    private readonly uploadPath;
    private readonly processedPath;
    constructor();
    processAudioFile(audioFile: AudioFile): Promise<{
        processedFile: AudioFile;
        metadata: ProcessingMetadata;
    }>;
    private convertAudioFile;
    private getAudioInfo;
    validateAudioFile(file: Express.Multer.File): Promise<boolean>;
    cleanupFile(filePath: string): Promise<void>;
    cleanupOldFiles(): Promise<void>;
    private cleanupDirectory;
    private ensureDirectoryExists;
    private formatFileSize;
    getProcessingProgress(fileSizeBytes: number): {
        estimatedTimeSeconds: number;
        complexity: 'low' | 'medium' | 'high';
    };
}
//# sourceMappingURL=audioProcessingService.d.ts.map