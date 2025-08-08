"use strict";
jest.setTimeout(30000);
global.mockAudioFile = {
    fieldname: 'audio',
    originalname: 'test-meeting.mp3',
    encoding: '7bit',
    mimetype: 'audio/mpeg',
    size: 1024 * 1024,
    destination: './uploads/audio',
    filename: 'test-audio-123.mp3',
    path: './uploads/audio/test-audio-123.mp3',
    buffer: Buffer.from('mock audio data')
};
global.mockMeeting = {
    id: 'meeting-123',
    title: 'Test Meeting',
    description: 'A test meeting for unit tests',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:30:00Z'),
    status: 'completed',
    participants: ['John Doe', 'Jane Smith'],
    language: 'id',
    duration: 1800
};
global.mockTranscriptionSegment = {
    id: 'segment-1',
    text: 'Selamat pagi, mari kita mulai rapat ini.',
    startTime: 0,
    endTime: 3.5,
    speaker: 'John Doe',
    confidence: 0.95,
    language: 'id'
};
global.mockTranscription = {
    id: 'transcription-123',
    meetingId: 'meeting-123',
    segments: [global.mockTranscriptionSegment],
    speakers: [{
            id: 'speaker-1',
            name: 'John Doe',
            confidence: 0.95,
            segments: 1,
            totalDuration: 3.5
        }],
    language: 'id',
    confidence: 0.95,
    duration: 1800,
    createdAt: new Date('2024-01-01T10:15:00Z'),
    updatedAt: new Date('2024-01-01T10:25:00Z'),
    status: 'completed'
};
global.mockSummary = {
    id: 'summary-123',
    meetingId: 'meeting-123',
    title: 'Meeting Summary',
    summary: 'This meeting discussed project updates and next steps.',
    keyPoints: [
        'Project is on track',
        'Budget approved',
        'Next milestone in 2 weeks'
    ],
    actionItems: [{
            id: 'action-1',
            description: 'Prepare budget report',
            assignee: 'John Doe',
            priority: 'medium',
            status: 'pending',
            extractedAt: new Date('2024-01-01T10:25:00Z')
        }],
    participants: ['John Doe', 'Jane Smith'],
    topics: [{
            id: 'topic-1',
            name: 'Budget Planning',
            confidence: 0.9,
            mentions: 5,
            timeSpent: 300,
            keyPhrases: ['budget', 'planning', 'allocation']
        }],
    sentiment: {
        overall: 'positive',
        confidence: 0.8,
        segments: []
    },
    language: 'id',
    createdAt: new Date('2024-01-01T10:25:00Z'),
    updatedAt: new Date('2024-01-01T10:25:00Z'),
    gptModel: 'gpt-4',
    processingTime: 1500
};
afterEach(() => {
    jest.clearAllMocks();
});
afterAll(() => {
    jest.restoreAllMocks();
});
//# sourceMappingURL=setupTests.js.map