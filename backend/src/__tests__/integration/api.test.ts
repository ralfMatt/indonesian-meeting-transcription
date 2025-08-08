import request from 'supertest';
import { app, server, wsService } from '@/server';
import fs from 'fs/promises';
import path from 'path';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Ensure upload directories exist
    await fs.mkdir('./uploads/audio', { recursive: true });
    await fs.mkdir('./uploads/processed', { recursive: true });
  });

  afterAll(async () => {
    // Cleanup
    await wsService.close();
    server.close();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: expect.any(String),
        services: expect.arrayContaining([
          expect.objectContaining({
            name: 'WebSocket Server',
            status: expect.stringMatching(/up|down/)
          }),
          expect.objectContaining({
            name: 'Audio Processing',
            status: 'up'
          })
        ]),
        uptime: expect.any(Number)
      });
    });
  });

  describe('API Documentation', () => {
    it('should return API documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);

      expect(response.body).toMatchObject({
        title: 'Indonesian Meeting Transcription API',
        version: '1.0.0',
        description: expect.any(String),
        endpoints: expect.any(Object),
        examples: expect.any(Object),
        supportedAudioFormats: expect.any(Array),
        limits: expect.any(Object)
      });
    });
  });

  describe('Audio Upload', () => {
    it('should handle missing audio file', async () => {
      const response = await request(app)
        .post('/api/meetings/upload')
        .field('title', 'Test Meeting')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'AUDIO_UPLOAD_FAILED',
        message: 'No audio file provided',
        statusCode: 400
      });
    });

    it('should handle unsupported file type', async () => {
      // Create a mock text file
      const textBuffer = Buffer.from('This is not an audio file');
      
      const response = await request(app)
        .post('/api/meetings/upload')
        .attach('audio', textBuffer, 'test.txt')
        .field('title', 'Test Meeting')
        .expect(400);

      expect(response.body.error).toBe('INVALID_AUDIO_FORMAT');
    });

    it('should accept valid audio file upload', async () => {
      // Create a mock MP3 file buffer
      const mp3Buffer = Buffer.from('mock mp3 data');
      
      const response = await request(app)
        .post('/api/meetings/upload')
        .attach('audio', mp3Buffer, 'test-meeting.mp3')
        .field('title', 'Integration Test Meeting')
        .field('description', 'A test meeting for integration tests')
        .field('language', 'id')
        .expect(201);

      expect(response.body).toMatchObject({
        meetingId: expect.any(String),
        message: 'Audio file uploaded successfully. Processing started.',
        status: 'processing',
        estimatedProcessingTime: expect.any(Number)
      });

      // Store meetingId for subsequent tests
      global.testMeetingId = response.body.meetingId;
    });
  });

  describe('Meeting Management', () => {
    it('should get all meetings', async () => {
      const response = await request(app)
        .get('/api/meetings')
        .expect(200);

      expect(response.body).toMatchObject({
        meetings: expect.any(Array),
        total: expect.any(Number)
      });

      if (response.body.meetings.length > 0) {
        expect(response.body.meetings[0]).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          status: expect.any(String),
          createdAt: expect.any(String),
          language: expect.any(String)
        });
      }
    });

    it('should get specific meeting', async () => {
      const meetingId = global.testMeetingId;
      if (!meetingId) {
        throw new Error('No test meeting ID available');
      }

      const response = await request(app)
        .get(`/api/meetings/${meetingId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        meeting: expect.objectContaining({
          id: meetingId,
          title: expect.any(String),
          status: expect.any(String),
          createdAt: expect.any(String)
        })
      });
    });

    it('should handle non-existent meeting', async () => {
      const response = await request(app)
        .get('/api/meetings/non-existent-id')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'MEETING_NOT_FOUND',
        message: 'Meeting not found',
        statusCode: 404
      });
    });

    it('should get meeting transcription', async () => {
      const meetingId = global.testMeetingId;
      if (!meetingId) {
        throw new Error('No test meeting ID available');
      }

      const response = await request(app)
        .get(`/api/meetings/${meetingId}/transcription`);

      // Could be 200 (transcription ready) or 202 (processing)
      expect([200, 202]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toMatchObject({
          meetingId,
          transcription: expect.objectContaining({
            id: expect.any(String),
            segments: expect.any(Array),
            speakers: expect.any(Array),
            language: expect.any(String),
            confidence: expect.any(Number)
          }),
          status: expect.any(String)
        });
      }
    });

    it('should get meeting summary', async () => {
      const meetingId = global.testMeetingId;
      if (!meetingId) {
        throw new Error('No test meeting ID available');
      }

      const response = await request(app)
        .get(`/api/meetings/${meetingId}/summary`);

      // Could be 200 (summary ready) or 202 (processing)
      expect([200, 202]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toMatchObject({
          meetingId,
          summary: expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            summary: expect.any(String),
            keyPoints: expect.any(Array),
            actionItems: expect.any(Array),
            topics: expect.any(Array),
            sentiment: expect.any(Object)
          }),
          status: expect.any(String)
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: 'Endpoint not found',
        statusCode: 404,
        availableEndpoints: expect.any(Array)
      });
    });

    it('should include request ID in responses', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['x-request-id']).toBeDefined();
      expect(typeof response.headers['x-request-id']).toBe('string');
    });

    it('should handle malicious input', async () => {
      const response = await request(app)
        .get('/api/meetings/../../../etc/passwd')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request detected',
        statusCode: 400
      });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should not expose sensitive headers', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/meetings/upload')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Compression', () => {
    it('should compress JSON responses', async () => {
      const response = await request(app)
        .get('/api/docs')
        .set('Accept-Encoding', 'gzip');

      // Check if response is compressed (presence of content-encoding header)
      expect(response.headers['content-encoding']).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should delete test meeting', async () => {
      const meetingId = global.testMeetingId;
      if (!meetingId) {
        throw new Error('No test meeting ID available');
      }

      await request(app)
        .delete(`/api/meetings/${meetingId}`)
        .expect(204);

      // Verify meeting is deleted
      await request(app)
        .get(`/api/meetings/${meetingId}`)
        .expect(404);
    });
  });
});

// Global types for test data
declare global {
  var testMeetingId: string;
}