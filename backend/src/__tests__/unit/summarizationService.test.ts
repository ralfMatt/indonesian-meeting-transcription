import { SummarizationService } from '@/services/summarizationService';
import { Transcription, MeetingSummary } from '@/types';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

describe('SummarizationService', () => {
  let summarizationService: SummarizationService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockTranscription: Transcription;

  beforeEach(() => {
    summarizationService = new SummarizationService();
    
    // Mock OpenAI instance
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;

    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);

    // Mock transcription data
    mockTranscription = {
      id: 'transcription-123',
      meetingId: 'meeting-123',
      segments: [
        {
          id: 'segment-1',
          text: 'Selamat pagi semua, mari kita mulai rapat ini.',
          startTime: 0,
          endTime: 3.5,
          speaker: 'Budi Santoso',
          confidence: 0.95,
          language: 'id'
        },
        {
          id: 'segment-2',
          text: 'Hari ini kita akan membahas proposal proyek baru.',
          startTime: 4.0,
          endTime: 8.2,
          speaker: 'Siti Nurhaliza',
          confidence: 0.92,
          language: 'id'
        }
      ],
      speakers: [
        {
          id: 'speaker-1',
          name: 'Budi Santoso',
          confidence: 0.95,
          segments: 1,
          totalDuration: 3.5
        },
        {
          id: 'speaker-2',
          name: 'Siti Nurhaliza',
          confidence: 0.92,
          segments: 1,
          totalDuration: 4.2
        }
      ],
      language: 'id',
      confidence: 0.935,
      duration: 8.2,
      createdAt: new Date('2024-01-01T10:15:00Z'),
      updatedAt: new Date('2024-01-01T10:25:00Z'),
      status: 'completed'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSummary', () => {
    it('should generate comprehensive meeting summary in Indonesian', async () => {
      // Mock GPT-4 responses
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Rapat Proyek Baru',
                summary: 'Rapat ini membahas proposal proyek baru dengan fokus pada analisis pasar dan strategi implementasi.',
                keyPoints: [
                  'Proyek baru disetujui untuk dilanjutkan',
                  'Target pasar adalah segmen millennial',
                  'Budget yang dibutuhkan sekitar 500 juta rupiah'
                ]
              })
            }
          }]
        } as any)
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                items: [
                  {
                    description: 'Siapkan proposal detail proyek',
                    assignee: 'Budi Santoso',
                    priority: 'high',
                    dueDate: '2024-01-15'
                  }
                ]
              })
            }
          }]
        } as any)
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                topics: [
                  {
                    name: 'Proyek Baru',
                    keyPhrases: ['proyek', 'proposal', 'implementasi'],
                    mentions: 5,
                    timeSpent: 180
                  }
                ]
              })
            }
          }]
        } as any)
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                overall: 'positive',
                confidence: 0.8,
                explanation: 'Diskusi berlangsung positif dengan antusiasme tinggi'
              })
            }
          }]
        } as any);

      const summary = await summarizationService.generateSummary(mockTranscription, 'id');

      expect(summary).toMatchObject({
        id: expect.any(String),
        meetingId: 'meeting-123',
        title: 'Rapat Proyek Baru',
        summary: expect.stringContaining('proyek baru'),
        keyPoints: expect.arrayContaining([
          expect.stringContaining('proyek')
        ]),
        actionItems: expect.arrayContaining([
          expect.objectContaining({
            description: 'Siapkan proposal detail proyek',
            assignee: 'Budi Santoso',
            priority: 'high',
            status: 'pending'
          })
        ]),
        participants: ['Budi Santoso', 'Siti Nurhaliza'],
        topics: expect.arrayContaining([
          expect.objectContaining({
            name: 'Proyek Baru',
            keyPhrases: expect.arrayContaining(['proyek'])
          })
        ]),
        sentiment: expect.objectContaining({
          overall: 'positive',
          confidence: 0.8
        }),
        language: 'id',
        gptModel: 'gpt-4',
        processingTime: expect.any(Number)
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(4);
    });

    it('should generate summary in English when specified', async () => {
      mockOpenAI.chat.completions.create
        .mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'New Project Meeting',
                summary: 'This meeting discussed a new project proposal.',
                keyPoints: ['Project approved', 'Budget allocated']
              })
            }
          }]
        } as any);

      const summary = await summarizationService.generateSummary(mockTranscription, 'en');

      expect(summary.language).toBe('en');
      expect(summary.title).toBe('New Project Meeting');
      
      // Check that English prompts were used
      const createCall = mockOpenAI.chat.completions.create.mock.calls[0];
      expect(createCall[0].messages[1].content).toContain('Here is a meeting transcript');
    });

    it('should handle GPT API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(summarizationService.generateSummary(mockTranscription, 'id'))
        .rejects.toThrow('Summary generation failed');
    });

    it('should handle malformed GPT responses', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      } as any);

      await expect(summarizationService.generateSummary(mockTranscription, 'id'))
        .rejects.toThrow('Summary generation failed');
    });
  });

  describe('extractActionItems', () => {
    it('should extract action items with proper structure', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              items: [
                {
                  description: 'Prepare project proposal',
                  assignee: 'John Doe',
                  priority: 'high',
                  dueDate: '2024-01-15'
                },
                {
                  description: 'Review budget allocation',
                  assignee: 'Jane Smith',
                  priority: 'medium',
                  dueDate: null
                }
              ]
            })
          }
        }]
      } as any);

      // Use private method through reflection for testing
      const extractActionItems = (summarizationService as any).extractActionItems.bind(summarizationService);
      const actionItems = await extractActionItems(mockTranscription, 'en');

      expect(actionItems).toHaveLength(2);
      expect(actionItems[0]).toMatchObject({
        id: expect.any(String),
        description: 'Prepare project proposal',
        assignee: 'John Doe',
        priority: 'high',
        status: 'pending',
        extractedAt: expect.any(Date)
      });
      expect(actionItems[0].dueDate).toBeInstanceOf(Date);
      expect(actionItems[1].dueDate).toBeUndefined();
    });

    it('should handle empty action items response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ items: [] })
          }
        }]
      } as any);

      const extractActionItems = (summarizationService as any).extractActionItems.bind(summarizationService);
      const actionItems = await extractActionItems(mockTranscription, 'en');

      expect(actionItems).toHaveLength(0);
    });
  });

  describe('updateActionItemStatus', () => {
    it('should update action item status correctly', () => {
      const mockSummary: MeetingSummary = {
        id: 'summary-123',
        meetingId: 'meeting-123',
        title: 'Test Summary',
        summary: 'Test summary content',
        keyPoints: [],
        actionItems: [
          {
            id: 'action-1',
            description: 'Test action',
            priority: 'medium',
            status: 'pending',
            extractedAt: new Date()
          }
        ],
        participants: [],
        topics: [],
        sentiment: { overall: 'neutral', confidence: 0.5, segments: [] },
        language: 'id',
        createdAt: new Date(),
        updatedAt: new Date(),
        gptModel: 'gpt-4',
        processingTime: 1000
      };

      const updatedSummary = summarizationService.updateActionItemStatus(
        mockSummary,
        'action-1',
        'completed'
      );

      expect(updatedSummary.actionItems[0].status).toBe('completed');
      expect(updatedSummary.updatedAt.getTime()).toBeGreaterThan(mockSummary.updatedAt.getTime());
    });

    it('should not modify action items with different IDs', () => {
      const mockSummary: MeetingSummary = {
        id: 'summary-123',
        meetingId: 'meeting-123',
        title: 'Test Summary',
        summary: 'Test summary content',
        keyPoints: [],
        actionItems: [
          {
            id: 'action-1',
            description: 'Test action 1',
            priority: 'medium',
            status: 'pending',
            extractedAt: new Date()
          },
          {
            id: 'action-2',
            description: 'Test action 2',
            priority: 'high',
            status: 'in_progress',
            extractedAt: new Date()
          }
        ],
        participants: [],
        topics: [],
        sentiment: { overall: 'neutral', confidence: 0.5, segments: [] },
        language: 'id',
        createdAt: new Date(),
        updatedAt: new Date(),
        gptModel: 'gpt-4',
        processingTime: 1000
      };

      const updatedSummary = summarizationService.updateActionItemStatus(
        mockSummary,
        'action-1',
        'completed'
      );

      expect(updatedSummary.actionItems[0].status).toBe('completed');
      expect(updatedSummary.actionItems[1].status).toBe('in_progress');
    });
  });

  describe('validateSummary', () => {
    it('should validate a good quality summary', () => {
      const mockSummary: MeetingSummary = {
        id: 'summary-123',
        meetingId: 'meeting-123',
        title: 'High Quality Meeting Summary',
        summary: 'This is a comprehensive meeting summary that contains detailed information about the discussion, decisions made, and next steps. It provides valuable insights for all participants and stakeholders.',
        keyPoints: [
          'Key point 1',
          'Key point 2',
          'Key point 3'
        ],
        actionItems: [
          {
            id: 'action-1',
            description: 'Test action',
            priority: 'medium',
            status: 'pending',
            extractedAt: new Date()
          }
        ],
        participants: ['John Doe', 'Jane Smith'],
        topics: [
          {
            id: 'topic-1',
            name: 'Project Planning',
            confidence: 0.9,
            mentions: 5,
            timeSpent: 300,
            keyPhrases: ['planning', 'project']
          }
        ],
        sentiment: { overall: 'positive', confidence: 0.8, segments: [] },
        language: 'id',
        createdAt: new Date(),
        updatedAt: new Date(),
        gptModel: 'gpt-4',
        processingTime: 5000
      };

      const validation = summarizationService.validateSummary(mockSummary);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.score).toBe(100);
    });

    it('should identify issues with poor quality summary', () => {
      const mockSummary: MeetingSummary = {
        id: 'summary-123',
        meetingId: 'meeting-123',
        title: 'Poor Summary',
        summary: 'Short', // Too short
        keyPoints: [], // No key points
        actionItems: [],
        participants: [], // No participants
        topics: [], // No topics
        sentiment: { overall: 'neutral', confidence: 0.5, segments: [] },
        language: 'id',
        createdAt: new Date(),
        updatedAt: new Date(),
        gptModel: 'gpt-4',
        processingTime: 35000 // Too long
      };

      const validation = summarizationService.validateSummary(mockSummary);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Summary is too short');
      expect(validation.issues).toContain('No key points identified');
      expect(validation.issues).toContain('No participants identified');
      expect(validation.issues).toContain('No topics identified');
      expect(validation.issues).toContain('Processing time is too long');
      expect(validation.score).toBeLessThan(100);
    });
  });

  describe('generateExecutiveSummary', () => {
    it('should generate concise executive summary', async () => {
      const mockSummary: MeetingSummary = {
        id: 'summary-123',
        meetingId: 'meeting-123',
        title: 'Quarterly Planning Meeting',
        summary: 'Detailed discussion about Q4 planning and resource allocation.',
        keyPoints: ['Budget approved', 'Timeline set', 'Team assigned'],
        actionItems: [{ id: '1', description: 'Prepare report', priority: 'high', status: 'pending', extractedAt: new Date() }],
        participants: ['John', 'Jane'],
        topics: [{ id: '1', name: 'Planning', confidence: 0.9, mentions: 5, timeSpent: 300, keyPhrases: ['plan'] }],
        sentiment: { overall: 'positive', confidence: 0.8, segments: [] },
        language: 'id',
        createdAt: new Date(),
        updatedAt: new Date(),
        gptModel: 'gpt-4',
        processingTime: 1000
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Tim telah menyetujui rencana kuartal Q4 dengan budget yang dialokasikan. Langkah selanjutnya adalah mempersiapkan laporan detail dan memulai implementasi sesuai timeline yang telah ditetapkan.'
          }
        }]
      } as any);

      const executiveSummary = await summarizationService.generateExecutiveSummary(mockSummary, 'id');

      expect(executiveSummary).toContain('Q4');
      expect(executiveSummary).toContain('budget');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          max_tokens: 300,
          temperature: 0.3
        })
      );
    });
  });
});