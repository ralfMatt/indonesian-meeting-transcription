import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { 
  MeetingSummary, 
  Transcription, 
  ActionItem, 
  Topic, 
  SentimentAnalysis,
  SentimentSegment 
} from '@/types';
import config from '@/config';

export class SummarizationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
  }

  /**
   * Generate comprehensive meeting summary from transcription
   */
  async generateSummary(
    transcription: Transcription,
    language: string = 'id'
  ): Promise<MeetingSummary> {
    try {
      const startTime = Date.now();
      
      // Create prompt for GPT-4 based on language
      const prompt = this.createSummaryPrompt(transcription, language);
      
      // Call GPT-4 for summary generation
      const gptResponse = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(language)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
        response_format: { type: 'json_object' }
      });

      const summaryData = JSON.parse(gptResponse.choices[0]?.message?.content || '{}');
      
      // Generate additional analysis
      const [actionItems, topics, sentiment] = await Promise.all([
        this.extractActionItems(transcription, language),
        this.extractTopics(transcription, language),
        this.analyzeSentiment(transcription, language)
      ]);

      const summary: MeetingSummary = {
        id: uuidv4(),
        meetingId: transcription.meetingId,
        title: summaryData.title || 'Meeting Summary',
        summary: summaryData.summary || '',
        keyPoints: summaryData.keyPoints || [],
        actionItems,
        participants: this.extractParticipants(transcription),
        topics,
        sentiment,
        language,
        createdAt: new Date(),
        updatedAt: new Date(),
        gptModel: config.openai.model,
        processingTime: Date.now() - startTime
      };

      return summary;
    } catch (error) {
      throw new Error(`Summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create GPT-4 prompt for summary generation
   */
  private createSummaryPrompt(transcription: Transcription, language: string): string {
    const transcriptionText = transcription.segments
      .map(segment => {
        const speaker = segment.speaker ? `[${segment.speaker}] ` : '';
        const timestamp = this.formatTimestamp(segment.startTime);
        return `${timestamp} ${speaker}${segment.text}`;
      })
      .join('\n');

    if (language === 'id') {
      return `
Berikut adalah transkrip rapat dalam bahasa Indonesia:

${transcriptionText}

Silakan analisis transkrip ini dan berikan ringkasan yang komprehensif dalam format JSON berikut:
{
  "title": "Judul rapat yang deskriptif",
  "summary": "Ringkasan lengkap rapat (3-4 paragraf)",
  "keyPoints": ["Poin penting 1", "Poin penting 2", "..."]
}

Pastikan ringkasan mencakup:
1. Tujuan utama rapat
2. Keputusan yang diambil
3. Diskusi utama
4. Next steps atau tindak lanjut
5. Informasi penting lainnya

Gunakan bahasa Indonesia yang profesional dan mudah dipahami.
      `.trim();
    } else {
      return `
Here is a meeting transcript:

${transcriptionText}

Please analyze this transcript and provide a comprehensive summary in the following JSON format:
{
  "title": "Descriptive meeting title",
  "summary": "Complete meeting summary (3-4 paragraphs)",
  "keyPoints": ["Key point 1", "Key point 2", "..."]
}

Make sure the summary includes:
1. Main purpose of the meeting
2. Decisions made
3. Key discussions
4. Next steps or follow-ups
5. Other important information

Use professional and clear language.
      `.trim();
    }
  }

  /**
   * Get system prompt based on language
   */
  private getSystemPrompt(language: string): string {
    if (language === 'id') {
      return `Anda adalah asisten AI yang ahli dalam menganalisis dan meringkas transkrip rapat dalam bahasa Indonesia. Tugas Anda adalah membuat ringkasan yang akurat, komprehensif, dan mudah dipahami. Fokus pada informasi penting, keputusan, dan tindak lanjut yang diperlukan. Selalu berikan respons dalam format JSON yang valid.`;
    } else {
      return `You are an AI assistant specialized in analyzing and summarizing meeting transcripts. Your task is to create accurate, comprehensive, and easy-to-understand summaries. Focus on important information, decisions, and required follow-ups. Always provide responses in valid JSON format.`;
    }
  }

  /**
   * Extract action items from transcription
   */
  private async extractActionItems(
    transcription: Transcription,
    language: string
  ): Promise<ActionItem[]> {
    try {
      const transcriptionText = transcription.segments
        .map(segment => `[${segment.speaker || 'Unknown'}] ${segment.text}`)
        .join('\n');

      const prompt = language === 'id' 
        ? `Analisis transkrip berikut dan ekstrak semua action items atau tugas yang disebutkan:

${transcriptionText}

Berikan hasil dalam format JSON array dengan struktur:
[
  {
    "description": "Deskripsi tugas",
    "assignee": "Nama penanggung jawab (jika disebutkan)",
    "priority": "low|medium|high|urgent",
    "dueDate": "YYYY-MM-DD (jika disebutkan, jika tidak gunakan null)"
  }
]`
        : `Analyze the following transcript and extract all action items or tasks mentioned:

${transcriptionText}

Provide the result in JSON array format with structure:
[
  {
    "description": "Task description",
    "assignee": "Responsible person name (if mentioned)",
    "priority": "low|medium|high|urgent", 
    "dueDate": "YYYY-MM-DD (if mentioned, otherwise null)"
  }
]`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting action items from meeting transcripts. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const actionItemsData = JSON.parse(response.choices[0]?.message?.content || '{"items": []}');
      const items = actionItemsData.items || actionItemsData || [];

      return items.map((item: any) => ({
        id: uuidv4(),
        description: item.description || '',
        assignee: item.assignee || undefined,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        priority: item.priority || 'medium',
        status: 'pending' as const,
        extractedAt: new Date()
      }));
    } catch (error) {
      console.error('Action items extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract topics and themes from transcription
   */
  private async extractTopics(
    transcription: Transcription,
    language: string
  ): Promise<Topic[]> {
    try {
      const transcriptionText = transcription.segments
        .map(segment => segment.text)
        .join(' ');

      const prompt = language === 'id'
        ? `Analisis teks transkrip rapat berikut dan identifikasi 5-10 topik utama yang dibahas:

${transcriptionText}

Berikan hasil dalam format JSON:
{
  "topics": [
    {
      "name": "Nama topik",
      "keyPhrases": ["frase kunci 1", "frase kunci 2"],
      "mentions": jumlah_sebutan_perkiraan,
      "timeSpent": perkiraan_waktu_dalam_detik
    }
  ]
}`
        : `Analyze the following meeting transcript text and identify 5-10 main topics discussed:

${transcriptionText}

Provide the result in JSON format:
{
  "topics": [
    {
      "name": "Topic name",
      "keyPhrases": ["key phrase 1", "key phrase 2"],
      "mentions": estimated_mention_count,
      "timeSpent": estimated_time_in_seconds
    }
  ]
}`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at topic extraction and analysis. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const topicsData = JSON.parse(response.choices[0]?.message?.content || '{"topics": []}');
      const topics = topicsData.topics || [];

      return topics.map((topic: any) => ({
        id: uuidv4(),
        name: topic.name || '',
        confidence: 0.8, // Default confidence for GPT-extracted topics
        mentions: topic.mentions || 1,
        timeSpent: topic.timeSpent || 60,
        keyPhrases: topic.keyPhrases || []
      }));
    } catch (error) {
      console.error('Topics extraction failed:', error);
      return [];
    }
  }

  /**
   * Analyze sentiment of the meeting
   */
  private async analyzeSentiment(
    transcription: Transcription,
    language: string
  ): Promise<SentimentAnalysis> {
    try {
      const transcriptionText = transcription.segments
        .map(segment => segment.text)
        .join(' ');

      const prompt = language === 'id'
        ? `Analisis sentimen dari transkrip rapat berikut:

${transcriptionText}

Berikan analisis sentimen dalam format JSON:
{
  "overall": "positive|neutral|negative",
  "confidence": nilai_confidence_0_sampai_1,
  "explanation": "Penjelasan singkat tentang sentimen keseluruhan"
}`
        : `Analyze the sentiment of the following meeting transcript:

${transcriptionText}

Provide sentiment analysis in JSON format:
{
  "overall": "positive|neutral|negative", 
  "confidence": confidence_score_0_to_1,
  "explanation": "Brief explanation of the overall sentiment"
}`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at sentiment analysis. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const sentimentData = JSON.parse(response.choices[0]?.message?.content || '{}');

      return {
        overall: sentimentData.overall || 'neutral',
        confidence: sentimentData.confidence || 0.5,
        segments: [] // TODO: Implement segment-level sentiment analysis
      };
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return {
        overall: 'neutral',
        confidence: 0.5,
        segments: []
      };
    }
  }

  /**
   * Extract participant names from transcription
   */
  private extractParticipants(transcription: Transcription): string[] {
    const participants = new Set<string>();
    
    transcription.segments.forEach(segment => {
      if (segment.speaker) {
        participants.add(segment.speaker);
      }
    });

    return Array.from(participants);
  }

  /**
   * Generate executive summary for long meetings
   */
  async generateExecutiveSummary(
    summary: MeetingSummary,
    language: string = 'id'
  ): Promise<string> {
    try {
      const prompt = language === 'id'
        ? `Berdasarkan ringkasan rapat berikut, buatlah executive summary yang singkat dan padat (maksimal 200 kata):

Judul: ${summary.title}
Ringkasan: ${summary.summary}
Poin Kunci: ${summary.keyPoints.join(', ')}
Jumlah Action Items: ${summary.actionItems.length}
Topik Utama: ${summary.topics.map(t => t.name).join(', ')}
Sentimen: ${summary.sentiment.overall}

Executive summary harus mencakup: tujuan rapat, keputusan utama, dan langkah selanjutnya.`
        : `Based on the following meeting summary, create a concise executive summary (maximum 200 words):

Title: ${summary.title}
Summary: ${summary.summary}
Key Points: ${summary.keyPoints.join(', ')}
Action Items Count: ${summary.actionItems.length}
Main Topics: ${summary.topics.map(t => t.name).join(', ')}
Sentiment: ${summary.sentiment.overall}

Executive summary should include: meeting purpose, key decisions, and next steps.`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: language === 'id' 
              ? 'Anda adalah ekspert dalam membuat executive summary yang efektif dan padat.'
              : 'You are an expert at creating effective and concise executive summaries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Executive summary generation failed:', error);
      return '';
    }
  }

  /**
   * Update action item status
   */
  updateActionItemStatus(
    summary: MeetingSummary,
    actionItemId: string,
    status: ActionItem['status']
  ): MeetingSummary {
    const updatedActionItems = summary.actionItems.map(item =>
      item.id === actionItemId ? { ...item, status } : item
    );

    return {
      ...summary,
      actionItems: updatedActionItems,
      updatedAt: new Date()
    };
  }

  /**
   * Generate follow-up recommendations
   */
  async generateFollowUpRecommendations(
    summary: MeetingSummary,
    language: string = 'id'
  ): Promise<string[]> {
    try {
      const prompt = language === 'id'
        ? `Berdasarkan ringkasan rapat ini, berikan 3-5 rekomendasi tindak lanjut yang spesifik dan dapat dijalankan:

${summary.summary}

Action Items yang ada: ${summary.actionItems.map(item => item.description).join(', ')}

Berikan rekomendasi dalam format JSON array: ["rekomendasi 1", "rekomendasi 2", ...]`
        : `Based on this meeting summary, provide 3-5 specific and actionable follow-up recommendations:

${summary.summary}

Existing Action Items: ${summary.actionItems.map(item => item.description).join(', ')}

Provide recommendations in JSON array format: ["recommendation 1", "recommendation 2", ...]`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at generating actionable follow-up recommendations. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.4,
        response_format: { type: 'json_object' }
      });

      const data = JSON.parse(response.choices[0]?.message?.content || '{"recommendations": []}');
      return data.recommendations || data || [];
    } catch (error) {
      console.error('Follow-up recommendations generation failed:', error);
      return [];
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Validate summary quality
   */
  validateSummary(summary: MeetingSummary): {
    isValid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    // Check summary length
    if (summary.summary.length < 100) {
      issues.push('Summary is too short');
      score -= 20;
    }

    if (summary.summary.length > 2000) {
      issues.push('Summary is too long');
      score -= 10;
    }

    // Check key points
    if (summary.keyPoints.length === 0) {
      issues.push('No key points identified');
      score -= 15;
    }

    if (summary.keyPoints.length > 10) {
      issues.push('Too many key points - consider consolidating');
      score -= 5;
    }

    // Check participants
    if (summary.participants.length === 0) {
      issues.push('No participants identified');
      score -= 10;
    }

    // Check topics
    if (summary.topics.length === 0) {
      issues.push('No topics identified');
      score -= 10;
    }

    // Check processing time (performance indicator)
    if (summary.processingTime > 30000) { // 30 seconds
      issues.push('Processing time is too long');
      score -= 5;
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }
}