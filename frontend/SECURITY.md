# Security Policy

## Vulnerability Management

### Dependency Updates
- **Critical**: Update within 24 hours
- **High**: Update within 7 days  
- **Medium**: Update within 30 days
- **Low**: Update during regular maintenance

### Current Vulnerabilities (npm audit findings)
- **nth-check** <2.0.1 (HIGH) - Regex DoS vulnerability
- **postcss** <8.4.31 (MODERATE) - Line return parsing error
- **webpack-dev-server** <=5.2.0 (MODERATE) - Source code exposure

### Remediation Steps
```bash
# Fix non-breaking vulnerabilities
npm audit fix

# For breaking changes, evaluate impact first
npm audit fix --force
```

### Security Scanning
Run security scans before deployment:
```bash
npm audit --audit-level moderate
npm run test
npm run build
```

### Content Security Policy
The application implements CSP headers to prevent XSS attacks:
- Script sources: self, unsafe-inline (dev only)
- Connect sources: self, WebSocket endpoints, OpenAI API
- Media sources: self, blob URLs for audio processing

### Data Handling
- **Audio Data**: Processed locally, temporary blob storage
- **Transcriptions**: Memory-only storage, no persistence
- **API Communications**: HTTPS in production, structured validation

### Reporting Security Issues
Report vulnerabilities to: security@transkripmeeting.com

### Production Deployment Checklist
- [ ] Update all dependencies
- [ ] Run security audit
- [ ] Enable HTTPS/WSS
- [ ] Configure CSP headers
- [ ] Remove development tools
- [ ] Enable security monitoring