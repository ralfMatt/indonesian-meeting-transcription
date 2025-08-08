import { WebSocket } from 'ws';
import { WSMessage, TranscriptionSegment } from '@/types';
interface WebSocketClient {
    id: string;
    ws: WebSocket;
    meetingId?: string;
    isAlive: boolean;
    lastActivity: Date;
}
export declare class WebSocketService {
    private wss;
    private clients;
    private transcriptionService;
    private heartbeatInterval;
    constructor();
    initialize(port?: number): void;
    private handleConnection;
    private handleMessage;
    private processMessage;
    private handleAudioChunk;
    private handleDisconnection;
    private handleClientError;
    private handleServerError;
    private handlePong;
    sendToClient(clientId: string, message: WSMessage): void;
    broadcast(message: WSMessage): void;
    broadcastToMeeting(meetingId: string, message: WSMessage, excludeClientId?: string): void;
    joinMeeting(clientId: string, meetingId: string): void;
    leaveMeeting(clientId: string): void;
    private sendError;
    sendProcessingStatus(clientId: string, meetingId: string | undefined, status: string, progress: number, message: string): void;
    private startHeartbeat;
    private stopHeartbeat;
    getStats(): {
        totalClients: number;
        activeClients: number;
        meetingRooms: {
            [meetingId: string]: number;
        };
    };
    close(): Promise<void>;
    sendTranscriptionUpdate(meetingId: string, segments: TranscriptionSegment[]): void;
    isRunning(): boolean;
    getClientInfo(clientId: string): WebSocketClient | undefined;
    getMeetingClients(meetingId: string): WebSocketClient[];
}
export {};
//# sourceMappingURL=websocketService.d.ts.map