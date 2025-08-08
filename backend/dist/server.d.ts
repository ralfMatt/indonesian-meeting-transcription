import { AudioProcessingService } from '@/services/audioProcessingService';
import { WebSocketService } from '@/services/websocketService';
declare const app: import("express-serve-static-core").Express;
declare const wsService: WebSocketService;
declare const audioProcessingService: AudioProcessingService;
declare const server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
export { app, server, wsService, audioProcessingService };
//# sourceMappingURL=server.d.ts.map