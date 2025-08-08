import { Request, Response, NextFunction } from 'express';
export declare const corsOptions: {
    origin: string | string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    optionsSuccessStatus: number;
};
export declare const rateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const helmetConfig: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const compressionConfig: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const requestId: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityHeaders: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRequest: (req: Request, res: Response, next: NextFunction) => void;
export declare const fileUploadSecurity: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityErrorHandler: (error: any, req: Request, res: Response, next: NextFunction) => void;
export declare const ipWhitelist: (allowedIPs: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const apiKeyAuth: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityLogger: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=security.d.ts.map