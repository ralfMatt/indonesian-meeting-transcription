import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { 
  WSMessage, 
  AudioChunkMessage, 
  TranscriptionSegmentMessage, 
  ProcessingStatusMessage,
  ErrorMessage,
  TranscriptionSegment
} from '@/types';
import { TranscriptionService } from './transcriptionService';
import config from '@/config';

interface WebSocketClient {
  id: string;
  ws: WebSocket;
  meetingId?: string;
  isAlive: boolean;
  lastActivity: Date;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WebSocketClient>();
  private transcriptionService: TranscriptionService;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.transcriptionService = new TranscriptionService();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(port: number = config.websocket.port): void {
    this.wss = new WebSocketServer({ 
      port,
      perMessageDeflate: false,
      maxPayload: 16 * 1024 * 1024, // 16MB for audio chunks
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));

    // Start heartbeat mechanism
    this.startHeartbeat();

    console.log(`WebSocket server listening on port ${port}`);
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const clientId = uuidv4();
    const client: WebSocketClient = {
      id: clientId,
      ws,
      isAlive: true,
      lastActivity: new Date()
    };

    this.clients.set(clientId, client);
    console.log(`Client ${clientId} connected. Total clients: ${this.clients.size}`);

    // Set up event handlers
    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason));
    ws.on('error', (error) => this.handleClientError(clientId, error));
    ws.on('pong', () => this.handlePong(clientId));

    // Send connection confirmation
    this.sendToClient(clientId, {
      type: 'connection_established',
      payload: { clientId },
      timestamp: new Date()
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(clientId: string, data: Buffer | string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    try {
      let message: WSMessage;

      // Handle binary data (audio chunks)
      if (Buffer.isBuffer(data)) {
        message = {
          type: 'audio_chunk',
          payload: {
            audioData: data.buffer,
            sequence: 0, // This would be extracted from the audio stream metadata
            isLast: false
          },
          meetingId: client.meetingId,
          timestamp: new Date()
        } as AudioChunkMessage;
      } else {
        // Handle text messages
        message = JSON.parse(data.toString()) as WSMessage;
      }

      await this.processMessage(clientId, message);
    } catch (error) {
      console.error(`Error processing message from client ${clientId}:`, error);
      this.sendError(clientId, 'WEBSOCKET_CONNECTION_ERROR', 'Failed to process message');
    }
  }

  /**
   * Process different types of WebSocket messages
   */
  private async processMessage(clientId: string, message: WSMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'audio_chunk':
        await this.handleAudioChunk(clientId, message as AudioChunkMessage);
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
        this.sendError(clientId, 'VALIDATION_ERROR', `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle audio chunk for real-time transcription
   */
  private async handleAudioChunk(clientId: string, message: AudioChunkMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const audioBuffer = Buffer.from(message.payload.audioData);
      
      // Process audio chunk for real-time transcription
      const segment = await this.transcriptionService.transcribeRealTime(
        audioBuffer,
        'id', // Default to Indonesian
        !message.payload.isLast
      );

      if (segment) {
        // Send transcription segment back to client
        const segmentMessage: TranscriptionSegmentMessage = {
          type: 'transcription_segment',
          meetingId: message.meetingId,
          timestamp: new Date(),
          payload: {
            segment,
            isPartial: segment.isPartial || false
          }
        };

        this.sendToClient(clientId, segmentMessage);

        // Broadcast to other clients in the same meeting if needed
        if (message.meetingId) {
          this.broadcastToMeeting(message.meetingId, segmentMessage, clientId);
        }
      }

      // Send processing status
      this.sendProcessingStatus(clientId, message.meetingId, 'live_processing', 100, 'Processing audio chunk...');

    } catch (error) {
      console.error(`Audio chunk processing failed for client ${clientId}:`, error);
      this.sendError(clientId, 'TRANSCRIPTION_FAILED', 'Failed to process audio chunk');
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string, code: number, reason: Buffer): void {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`Client ${clientId} disconnected. Code: ${code}, Reason: ${reason.toString()}`);
      
      // Send disconnection message to other clients in the same meeting
      if (client.meetingId) {
        this.broadcastToMeeting(client.meetingId, {
          type: 'connection_closed',
          payload: { clientId },
          timestamp: new Date()
        }, clientId);
      }

      this.clients.delete(clientId);
    }
  }

  /**
   * Handle client errors
   */
  private handleClientError(clientId: string, error: Error): void {
    console.error(`WebSocket client ${clientId} error:`, error);
    this.sendError(clientId, 'WEBSOCKET_CONNECTION_ERROR', error.message);
  }

  /**
   * Handle server errors
   */
  private handleServerError(error: Error): void {
    console.error('WebSocket server error:', error);
  }

  /**
   * Handle pong response from client
   */
  private handlePong(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.isAlive = true;
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message: WSMessage): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  /**
   * Broadcast message to all clients in a specific meeting
   */
  broadcastToMeeting(meetingId: string, message: WSMessage, excludeClientId?: string): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client, clientId) => {
      if (
        client.meetingId === meetingId && 
        clientId !== excludeClientId &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(messageStr);
      }
    });
  }

  /**
   * Join client to a meeting room
   */
  joinMeeting(clientId: string, meetingId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.meetingId = meetingId;
      console.log(`Client ${clientId} joined meeting ${meetingId}`);
    }
  }

  /**
   * Remove client from meeting room
   */
  leaveMeeting(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client && client.meetingId) {
      console.log(`Client ${clientId} left meeting ${client.meetingId}`);
      client.meetingId = undefined;
    }
  }

  /**
   * Send error message to client
   */
  private sendError(clientId: string, code: string, message: string): void {
    const errorMessage: ErrorMessage = {
      type: 'error',
      timestamp: new Date(),
      payload: {
        code: code as any,
        message,
        details: { clientId }
      }
    };

    this.sendToClient(clientId, errorMessage);
  }

  /**
   * Send processing status update
   */
  sendProcessingStatus(
    clientId: string, 
    meetingId: string | undefined, 
    status: string, 
    progress: number, 
    message: string
  ): void {
    const statusMessage: ProcessingStatusMessage = {
      type: 'processing_status',
      meetingId,
      timestamp: new Date(),
      payload: {
        status: status as any,
        progress,
        message
      }
    };

    this.sendToClient(clientId, statusMessage);
  }

  /**
   * Start heartbeat mechanism to detect disconnected clients
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          console.log(`Terminating inactive client ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        // Check for inactive clients (no activity for 5 minutes)
        const now = Date.now();
        const lastActivity = client.lastActivity.getTime();
        if (now - lastActivity > 5 * 60 * 1000) {
          console.log(`Client ${clientId} inactive for too long, terminating`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, config.websocket.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalClients: number;
    activeClients: number;
    meetingRooms: { [meetingId: string]: number };
  } {
    const meetingRooms: { [meetingId: string]: number } = {};
    let activeClients = 0;

    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        activeClients++;
      }

      if (client.meetingId) {
        meetingRooms[client.meetingId] = (meetingRooms[client.meetingId] || 0) + 1;
      }
    });

    return {
      totalClients: this.clients.size,
      activeClients,
      meetingRooms
    };
  }

  /**
   * Close all connections and shut down server
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      this.stopHeartbeat();

      // Close all client connections
      this.clients.forEach(client => {
        client.ws.close(1001, 'Server shutting down');
      });
      this.clients.clear();

      // Close server
      if (this.wss) {
        this.wss.close((error) => {
          if (error) {
            console.error('Error closing WebSocket server:', error);
          } else {
            console.log('WebSocket server closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Send transcription update to clients
   */
  sendTranscriptionUpdate(meetingId: string, segments: TranscriptionSegment[]): void {
    const message: WSMessage = {
      type: 'transcription_update',
      meetingId,
      timestamp: new Date(),
      payload: { segments }
    };

    this.broadcastToMeeting(meetingId, message);
  }

  /**
   * Check if WebSocket server is running
   */
  isRunning(): boolean {
    return this.wss !== null && this.wss.readyState === WebSocketServer.OPEN;
  }

  /**
   * Get client information
   */
  getClientInfo(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all clients in a meeting
   */
  getMeetingClients(meetingId: string): WebSocketClient[] {
    const clients: WebSocketClient[] = [];
    this.clients.forEach(client => {
      if (client.meetingId === meetingId) {
        clients.push(client);
      }
    });
    return clients;
  }
}