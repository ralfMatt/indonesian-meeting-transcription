# 🛡️ Security Guide for Indonesian Meeting Transcription App

This guide provides comprehensive security setup instructions for Indonesian SME companies testing and deploying the Meeting Transcription application.

## 📋 Table of Contents

1. [Quick Security Setup](#quick-security-setup)
2. [Environment Configuration](#environment-configuration)
3. [Database Security](#database-security)
4. [Authentication & Authorization](#authentication--authorization)
5. [Data Encryption](#data-encryption)
6. [Indonesian Business Compliance](#indonesian-business-compliance)
7. [Production Deployment](#production-deployment)
8. [Security Monitoring](#security-monitoring)
9. [Testing Security](#testing-security)

---

## 🚀 Quick Security Setup

### Prerequisites for Indonesian SME Testing

1. **Node.js** 18+ and npm 8+
2. **Supabase Account** (for database and authentication)
3. **OpenAI API Key** (for meeting summarization)
4. **HTTPS Domain** (required for production)

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd meeting-transcription-app

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Run Security Check

```bash
# Run comprehensive security validation
node scripts/security-check.js

# This will:
# ✅ Validate security configuration
# ⚠️  Identify potential issues  
# 💡 Provide Indonesian business recommendations
# 🔑 Generate production-ready secrets
```

### 3. Environment Setup

```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp .env.example .env

# Generate secure production secrets
node -e "
const crypto = require('crypto');
console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('ENCRYPTION_KEY=' + crypto.randomBytes(16).toString('hex'));
console.log('SESSION_SECRET=' + crypto.randomBytes(32).toString('hex'));
"
```

---

## 🔧 Environment Configuration

### Backend Security Variables (Required)

Create `backend/.env` with these **critical** security settings:

```bash
# =================================================================
# CRITICAL SECURITY (Change for Production!)
# =================================================================
JWT_SECRET=your-64-character-random-secret-here
ENCRYPTION_KEY=your-32-character-key-here
SESSION_SECRET=your-session-secret-here

# =================================================================
# DATABASE CONFIGURATION
# =================================================================
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# =================================================================
# OPENAI INTEGRATION
# =================================================================
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# =================================================================
# SECURITY SETTINGS
# =================================================================
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_MAX_REQUESTS=100
FORCE_HTTPS=true
TRUST_PROXY=true
```

### Frontend Security Variables

Create `frontend/.env` with these settings:

```bash
# =================================================================
# API ENDPOINTS
# =================================================================
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_WS_URL=wss://api.your-domain.com

# =================================================================
# SUPABASE CONFIGURATION
# =================================================================
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key

# =================================================================
# SECURITY SETTINGS
# =================================================================
REACT_APP_STRICT_SECURITY=true
REACT_APP_SECURE_COOKIES=true

# =================================================================
# INDONESIAN SETTINGS
# =================================================================
REACT_APP_DEFAULT_TIMEZONE=Asia/Jakarta
REACT_APP_ENABLE_INDONESIAN_FEATURES=true
```

---

## 🗄️ Database Security

### Supabase Row Level Security (RLS)

Enable RLS for meeting data isolation:

```sql
-- Enable RLS on meetings table
ALTER TABLE "Meetings" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own meetings
CREATE POLICY "Users can access own meetings" ON "Meetings"
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can insert their own meetings
CREATE POLICY "Users can insert own meetings" ON "Meetings"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own meetings
CREATE POLICY "Users can update own meetings" ON "Meetings"
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own meetings
CREATE POLICY "Users can delete own meetings" ON "Meetings"
  FOR DELETE USING (auth.uid() = user_id);
```

### Database Security Checklist

- [x] **Row Level Security (RLS) enabled**
- [x] **User isolation policies implemented**
- [x] **Service key used only on backend**
- [x] **Anon key used only for authentication**
- [x] **Database backups enabled**
- [x] **Point-in-time recovery configured**

---

## 🔐 Authentication & Authorization

### Password Security

The app implements enterprise-grade password security:

```javascript
// Automatic password requirements:
// ✅ Minimum 8 characters
// ✅ At least 1 uppercase letter
// ✅ At least 1 lowercase letter
// ✅ At least 1 number
// ✅ Bcrypt hashing with salt rounds 12
```

### Session Security

- **JWT tokens** with 24-hour expiry (business-friendly)
- **Refresh tokens** with 7-day expiry
- **Secure session validation**
- **Automatic session cleanup**

### Indonesian Business Features

- **Company registration** support
- **Multi-user team management** (up to 10 users per SME)
- **Role-based access control**
- **Audit logging** for compliance

---

## 🔒 Data Encryption

### Meeting Data Protection

All sensitive meeting data is encrypted:

- **Transcription content**: AES-256-GCM encryption
- **Meeting summaries**: End-to-end encryption
- **Audio files**: Secure temporary storage
- **User passwords**: Bcrypt with salt rounds 12

### Implementation

```javascript
// Data encryption is automatic:
import { DataEncryption } from './utils/security';

// Encrypt meeting transcription
const encrypted = DataEncryption.encryptData(transcriptionText);

// Decrypt when needed
const decrypted = DataEncryption.decryptData(encrypted);
```

---

## 🇮🇩 Indonesian Business Compliance

### Data Residency

- **Server location**: Deploy in Indonesian data centers
- **Data processing**: Keep SME data within Indonesian jurisdiction
- **Supabase regions**: Use Singapore region (closest to Indonesia)

### Regulatory Compliance

1. **Data Protection**
   - User consent management
   - Data retention policies (12 months default)
   - Right to data deletion
   - Data export capabilities

2. **Business Compliance**
   - Meeting audit trails
   - User access logging
   - Data modification tracking
   - Business hours enforcement

3. **Indonesian Language Support**
   - Bahasa Indonesia interface
   - Indonesian business terminology
   - Jakarta timezone (Asia/Jakarta)
   - Indonesian date/time formats

---

## 🚀 Production Deployment

### 1. Security Pre-Deployment Checklist

Run the security check before deployment:

```bash
node scripts/security-check.js

# Ensure all items pass:
# ✅ Environment variables configured
# ✅ Database security enabled
# ✅ HTTPS certificates ready
# ✅ Security headers configured
# ✅ Rate limiting active
```

### 2. Recommended Hosting Platforms

**For Indonesian SME Companies:**

1. **Frontend**: Vercel, Netlify, or AWS CloudFront
2. **Backend**: Railway, Render, or AWS Elastic Beanstalk
3. **Database**: Supabase (Singapore region)

### 3. HTTPS Configuration

HTTPS is **required** for Indonesian business compliance:

```bash
# Most platforms auto-configure HTTPS
# Verify HTTPS is working:
curl -I https://your-domain.com

# Should return:
# HTTP/2 200
# strict-transport-security: max-age=31536000
```

### 4. Environment Variables for Production

```bash
# Backend production .env
NODE_ENV=production
FORCE_HTTPS=true
TRUST_PROXY=true
CORS_ORIGIN=https://your-domain.com
JWT_SECRET=<your-64-char-secret>
ENCRYPTION_KEY=<your-32-char-key>

# Frontend production .env  
REACT_APP_STRICT_SECURITY=true
REACT_APP_SECURE_COOKIES=true
REACT_APP_API_URL=https://api.your-domain.com
```

---

## 📊 Security Monitoring

### 1. Enable Security Logging

```bash
# Backend .env
SECURITY_LOGGING=true
LOG_LEVEL=info

# This enables:
# 🔍 Failed login attempts
# 🚨 Rate limit violations
# 📝 Data access auditing
# ⚠️  Security event alerts
```

### 2. Monitoring Dashboard

Set up monitoring for Indonesian business operations:

- **Uptime monitoring**: 99.9% availability target
- **Performance monitoring**: <200ms API response time
- **Security alerts**: Real-time threat detection
- **Usage analytics**: SME business insights

### 3. Log Analysis

Monitor these security events:

```bash
# Suspicious activities to watch:
# - Multiple failed login attempts
# - Unusual API access patterns
# - Large file upload attempts
# - Cross-origin request violations
# - Rate limit exceeded events
```

---

## 🧪 Testing Security

### 1. Automated Security Testing

```bash
# Run comprehensive security tests
npm run test:security

# Tests include:
# ✅ Authentication flows
# ✅ Authorization checks
# ✅ Input validation
# ✅ Rate limiting
# ✅ Data encryption
# ✅ SQL injection prevention
```

### 2. Manual Security Testing

Test these scenarios before SME company testing:

1. **Authentication Testing**
   ```bash
   # Test invalid login attempts
   # Verify password strength requirements
   # Check session timeout behavior
   ```

2. **Authorization Testing**
   ```bash
   # Verify users can only access their meetings
   # Test role-based permissions
   # Check data isolation between companies
   ```

3. **Input Validation Testing**
   ```bash
   # Test XSS prevention
   # Verify file upload restrictions
   # Check Indonesian character handling
   ```

### 3. Indonesian SME Test Scenarios

Before rolling out to companies, test:

- **Multi-user companies**: 5-10 users per organization
- **Indonesian language content**: Bahasa Indonesia meeting transcription
- **Business workflows**: Meeting creation → transcription → summary → export
- **Data privacy**: Ensure company data isolation
- **Performance**: Handle typical SME meeting loads

---

## 🆘 Security Incident Response

### 1. Incident Response Plan

For Indonesian SME companies, have these contacts ready:

```yaml
Security Team: security@your-company.com
Technical Support: support@your-company.com  
Emergency Contact: +62-XXX-XXXX-XXXX
Business Hours: 08:00-18:00 WIB (Jakarta time)
```

### 2. Common Security Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Failed Authentication | Users can't log in | Check Supabase connection |
| Slow Performance | App responds slowly | Check rate limiting settings |
| Data Access Issues | Users can't see meetings | Verify RLS policies |
| Upload Problems | File uploads fail | Check file size limits |

### 3. Data Breach Response

If a security incident occurs:

1. **Immediate Response** (0-1 hours)
   - Isolate affected systems
   - Notify security team
   - Document incident details

2. **Investigation** (1-24 hours)
   - Assess data exposure
   - Identify root cause
   - Implement immediate fixes

3. **Recovery** (24-72 hours)
   - Restore secure operations
   - Notify affected Indonesian companies
   - Implement additional safeguards

4. **Follow-up** (1 week)
   - Conduct post-incident review
   - Update security procedures
   - Provide security training

---

## 📞 Support for Indonesian SME Companies

### Technical Support

- **Email**: support@your-domain.com
- **Business Hours**: 08:00-18:00 WIB (Jakarta Time)
- **Languages**: Bahasa Indonesia, English
- **Response Time**: 24 hours for security issues

### Security Questions?

For security-related questions from Indonesian SME companies:

1. **General Security**: Refer to this guide
2. **Company-specific Setup**: Schedule a security consultation
3. **Incident Response**: Use emergency contact procedures
4. **Compliance Questions**: Provide Indonesian regulation guidance

---

## ✅ Security Checklist for Go-Live

Before allowing Indonesian SME companies to test:

### Infrastructure Security
- [ ] HTTPS enabled with valid SSL certificates
- [ ] Environment variables properly configured
- [ ] Database RLS policies active
- [ ] Rate limiting configured
- [ ] Security headers implemented

### Application Security  
- [ ] Authentication working correctly
- [ ] Password requirements enforced
- [ ] Data encryption active
- [ ] Input validation implemented
- [ ] Session management secure

### Business Security
- [ ] User data isolation verified
- [ ] Indonesian compliance features enabled
- [ ] Audit logging active
- [ ] Data retention policies configured
- [ ] Export/deletion capabilities working

### Monitoring Security
- [ ] Security event logging enabled
- [ ] Uptime monitoring configured
- [ ] Performance monitoring active  
- [ ] Incident response plan documented
- [ ] Emergency contacts updated

---

## 📚 Additional Resources

- [Supabase Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Indonesian Data Protection Regulations](https://www.dataprotection.org.id)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [React Security Guidelines](https://react.dev/reference/react-dom/server/security)

---

**🇮🇩 Made for Indonesian SME Companies**

This security implementation follows international best practices while addressing specific needs of Indonesian small and medium enterprises. All security measures are designed to be business-friendly while maintaining the highest standards of data protection.

For questions or security consultations, contact our Indonesian business support team.