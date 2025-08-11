// Security Event Logger
// Logs security-relevant events for monitoring and incident response

interface SecurityEvent {
  event: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  details: Record<string, any>;
  timestamp: string;
  userAgent: string;
  sessionId?: string;
}

class SecurityLogger {
  private sessionId: string;
  private events: SecurityEvent[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logEvent(event: string, level: SecurityEvent['level'], details: Record<string, any>) {
    const securityEvent: SecurityEvent = {
      event,
      level,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
    };

    this.events.push(securityEvent);
    
    // Console logging for development
    const logMethod = level === 'critical' || level === 'error' ? 'error' : 
                     level === 'warning' ? 'warn' : 'info';
    console[logMethod](`[SECURITY:${level.toUpperCase()}]`, event, details);

    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production' && level !== 'info') {
      this.sendToMonitoring(securityEvent);
    }
  }

  private async sendToMonitoring(event: SecurityEvent) {
    try {
      // Send to security monitoring endpoint (implement in production)
      await fetch('/api/security/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to send security event to monitoring:', error);
    }
  }

  // Security Event Methods
  logMicrophoneAccess(granted: boolean) {
    this.logEvent('microphone_access', granted ? 'info' : 'warning', {
      granted,
      permission: granted ? 'granted' : 'denied'
    });
  }

  logWebSocketConnection(url: string, success: boolean) {
    this.logEvent('websocket_connection', success ? 'info' : 'error', {
      url,
      success,
      secure: url.startsWith('wss://')
    });
  }

  logFileUpload(filename: string, size: number, type: string, success: boolean) {
    this.logEvent('file_upload', success ? 'info' : 'warning', {
      filename: filename.substring(0, 50), // Truncate for privacy
      size,
      type,
      success
    });
  }

  logAPICall(endpoint: string, method: string, statusCode?: number) {
    const level = !statusCode || statusCode >= 400 ? 'error' : 'info';
    this.logEvent('api_call', level, {
      endpoint,
      method,
      statusCode
    });
  }

  logSecurityViolation(violation: string, details: Record<string, any>) {
    this.logEvent('security_violation', 'critical', {
      violation,
      ...details
    });
  }

  logInvalidInput(inputType: string, reason: string) {
    this.logEvent('invalid_input', 'warning', {
      inputType,
      reason
    });
  }

  // Get events for debugging (dev only)
  getEvents(): SecurityEvent[] {
    return process.env.NODE_ENV === 'development' ? [...this.events] : [];
  }

  // Clear events (cleanup)
  clearEvents() {
    this.events = [];
  }
}

// Singleton instance
export const securityLogger = new SecurityLogger();

// Export types for use in components
export type { SecurityEvent };