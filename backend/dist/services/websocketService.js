"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const transcriptionService_1 = require("./transcriptionService");
const config_1 = __importDefault(require("@/config"));
class WebSocketService {
    wss = null;
    clients = new Map();
    transcriptionService;
    heartbeatInterval = null;
    constructor() {
        this.transcriptionService = new transcriptionService_1.TranscriptionService();
    }
    initialize(port = config_1.default.websocket.port) {
        this.wss = new ws_1.WebSocketServer({
            port,
            perMessageDeflate: false,
            maxPayload: 16 * 1024 * 1024,
        });
        this.wss.on('connection', this.handleConnection.bind(this));
        this.wss.on('error', this.handleServerError.bind(this));
        this.startHeartbeat();
        console.log(`WebSocket server listening on port ${port}`);
    }
    handleConnection(ws, request) {
        const clientId = (0, uuid_1.v4)();
        const client = {
            id: clientId,
            ws,
            isAlive: true,
            lastActivity: new Date()
        };
        this.clients.set(clientId, client);
        console.log(`Client ${clientId} connected. Total clients: ${this.clients.size}`);
        ws.on('message', (data) => this.handleMessage(clientId, data));
        ws.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason));
        ws.on('error', (error) => this.handleClientError(clientId, error));
        ws.on('pong', () => this.handlePong(clientId));
        this.sendToClient(clientId, {
            type: 'connection_established',
            payload: { clientId },
            timestamp: new Date()
        });
    }
    async handleMessage(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        client.lastActivity = new Date();
        try {
            let message;
            if (Buffer.isBuffer(data)) {
                message = {
                    type: 'audio_chunk',
                    payload: {
                        audioData: data.buffer,
                        sequence: 0,
                        isLast: false
                    },
                    meetingId: client.meetingId,
                    timestamp: new Date()
                };
            }
            else {
                message = JSON.parse(data.toString());
            }
            await this.processMessage(clientId, message);
        }
        catch (error) {
            console.error(`Error processing message from client ${clientId}:`, error);
            this.sendError(clientId, 'WEBSOCKET_CONNECTION_ERROR', 'Failed to process message');
        }
    }
    async processMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        switch (message.type) {
            case 'audio_chunk':
                await this.handleAudioChunk(clientId, message);
                break;
            default:
                console.warn(`Unknown message type: ${message.type}`);
                this.sendError(clientId, 'VALIDATION_ERROR', `Unknown message type: ${message.type}`);
        }
    }
    async handleAudioChunk(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        try {
            const audioBuffer = Buffer.from(message.payload.audioData);
            const segment = await this.transcriptionService.transcribeRealTime(audioBuffer, 'id', !message.payload.isLast);
            if (segment) {
                const segmentMessage = {
                    type: 'transcription_segment',
                    meetingId: message.meetingId,
                    timestamp: new Date(),
                    payload: {
                        segment,
                        isPartial: segment.isPartial || false
                    }
                };
                this.sendToClient(clientId, segmentMessage);
                if (message.meetingId) {
                    this.broadcastToMeeting(message.meetingId, segmentMessage, clientId);
                }
            }
            this.sendProcessingStatus(clientId, message.meetingId, 'live_processing', 100, 'Processing audio chunk...');
        }
        catch (error) {
            console.error(`Audio chunk processing failed for client ${clientId}:`, error);
            this.sendError(clientId, 'TRANSCRIPTION_FAILED', 'Failed to process audio chunk');
        }
    }
    handleDisconnection(clientId, code, reason) {
        const client = this.clients.get(clientId);
        if (client) {
            console.log(`Client ${clientId} disconnected. Code: ${code}, Reason: ${reason.toString()}`);
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
    handleClientError(clientId, error) {
        console.error(`WebSocket client ${clientId} error:`, error);
        this.sendError(clientId, 'WEBSOCKET_CONNECTION_ERROR', error.message);
    }
    handleServerError(error) {
        console.error('WebSocket server error:', error);
    }
    handlePong(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.isAlive = true;
        }
    }
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === ws_1.WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }
    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.ws.readyState === ws_1.WebSocket.OPEN) {
                client.ws.send(messageStr);
            }
        });
    }
    broadcastToMeeting(meetingId, message, excludeClientId) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach((client, clientId) => {
            if (client.meetingId === meetingId &&
                clientId !== excludeClientId &&
                client.ws.readyState === ws_1.WebSocket.OPEN) {
                client.ws.send(messageStr);
            }
        });
    }
    joinMeeting(clientId, meetingId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.meetingId = meetingId;
            console.log(`Client ${clientId} joined meeting ${meetingId}`);
        }
    }
    leaveMeeting(clientId) {
        const client = this.clients.get(clientId);
        if (client && client.meetingId) {
            console.log(`Client ${clientId} left meeting ${client.meetingId}`);
            client.meetingId = undefined;
        }
    }
    sendError(clientId, code, message) {
        const errorMessage = {
            type: 'error',
            timestamp: new Date(),
            payload: {
                code: code,
                message,
                details: { clientId }
            }
        };
        this.sendToClient(clientId, errorMessage);
    }
    sendProcessingStatus(clientId, meetingId, status, progress, message) {
        const statusMessage = {
            type: 'processing_status',
            meetingId,
            timestamp: new Date(),
            payload: {
                status: status,
                progress,
                message
            }
        };
        this.sendToClient(clientId, statusMessage);
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.clients.forEach((client, clientId) => {
                if (!client.isAlive) {
                    console.log(`Terminating inactive client ${clientId}`);
                    client.ws.terminate();
                    this.clients.delete(clientId);
                    return;
                }
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
        }, config_1.default.websocket.heartbeatInterval);
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    getStats() {
        const meetingRooms = {};
        let activeClients = 0;
        this.clients.forEach(client => {
            if (client.ws.readyState === ws_1.WebSocket.OPEN) {
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
    close() {
        return new Promise((resolve) => {
            this.stopHeartbeat();
            this.clients.forEach(client => {
                client.ws.close(1001, 'Server shutting down');
            });
            this.clients.clear();
            if (this.wss) {
                this.wss.close((error) => {
                    if (error) {
                        console.error('Error closing WebSocket server:', error);
                    }
                    else {
                        console.log('WebSocket server closed');
                    }
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    sendTranscriptionUpdate(meetingId, segments) {
        const message = {
            type: 'transcription_update',
            meetingId,
            timestamp: new Date(),
            payload: { segments }
        };
        this.broadcastToMeeting(meetingId, message);
    }
    isRunning() {
        return this.wss !== null && this.wss.readyState === ws_1.WebSocketServer.OPEN;
    }
    getClientInfo(clientId) {
        return this.clients.get(clientId);
    }
    getMeetingClients(meetingId) {
        const clients = [];
        this.clients.forEach(client => {
            if (client.meetingId === meetingId) {
                clients.push(client);
            }
        });
        return clients;
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=websocketService.js.map