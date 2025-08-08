import { MeetingSummary, Transcription, ActionItem } from '@/types';
export declare class SummarizationService {
    private openai;
    constructor();
    generateSummary(transcription: Transcription, language?: string): Promise<MeetingSummary>;
    private createSummaryPrompt;
    private getSystemPrompt;
    private extractActionItems;
    private extractTopics;
    private analyzeSentiment;
    private extractParticipants;
    generateExecutiveSummary(summary: MeetingSummary, language?: string): Promise<string>;
    updateActionItemStatus(summary: MeetingSummary, actionItemId: string, status: ActionItem['status']): MeetingSummary;
    generateFollowUpRecommendations(summary: MeetingSummary, language?: string): Promise<string[]>;
    private formatTimestamp;
    validateSummary(summary: MeetingSummary): {
        isValid: boolean;
        issues: string[];
        score: number;
    };
}
//# sourceMappingURL=summarizationService.d.ts.map