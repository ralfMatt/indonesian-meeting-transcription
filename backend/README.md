# Indonesian Meeting Transcription API

A robust backend API for transcribing Indonesian meeting recordings and generating comprehensive summaries with action items extraction.

## 🚀 Features

- **Indonesian Language Support**: Optimized for Bahasa Indonesia transcription using Whisper
- **Real-time Transcription**: WebSocket-based live audio processing
- **AI-Powered Summaries**: GPT-4 integration for intelligent meeting summaries
- **Action Items Extraction**: Automatic identification and tracking of action items
- **Multiple Audio Formats**: Support for MP3, WAV, M4A, WebM, OGG, FLAC
- **RESTful API**: Comprehensive REST endpoints for all operations
- **Security-First**: Rate limiting, CORS, helmet, input validation
- **Comprehensive Testing**: 90%+ test coverage with unit and integration tests
- **Docker Support**: Production-ready containerization
- **Monitoring Ready**: Health checks and metrics endpoints

## 📋 Prerequisites

- Node.js 18+ 
- npm 8+
- FFmpeg (for audio processing)
- OpenAI API key
- Python 3.8+ (for Whisper)

## 🛠️ Installation

### Development Setup

1. **Clone and Install**:
```bash
git clone <repository-url>
cd meeting-transcription-app/backend
npm install
```

2. **Environment Configuration**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Required Environment Variables**:
```env
NODE_ENV=development
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
WHISPER_MODEL_SIZE=base
CORS_ORIGIN=http://localhost:3000
```

4. **Create Required Directories**:
```bash
mkdir -p uploads/{audio,processed} logs models/whisper
```

5. **Start Development Server**:
```bash
npm run dev
```

### Production Setup

1. **Build Application**:
```bash
npm run build
npm start
```

2. **Docker Deployment**:
```bash
# Build and start all services
docker-compose up -d

# With monitoring
docker-compose --profile monitoring up -d

# Development with frontend
docker-compose --profile development up -d
```

## 🔧 Configuration

### Core Settings

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 3001 | HTTP API port |
| `WS_PORT` | 3002 | WebSocket port |
| `OPENAI_API_KEY` | - | OpenAI API key (required) |
| `WHISPER_MODEL_SIZE` | base | Whisper model size |
| `MAX_FILE_SIZE` | 100MB | Maximum upload size |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Rate limit per window |

### Audio Processing

| Variable | Default | Description |
|----------|---------|-------------|
| `AUDIO_UPLOAD_PATH` | ./uploads/audio | Upload directory |
| `PROCESSED_AUDIO_PATH` | ./uploads/processed | Processed files directory |
| `CLEANUP_INTERVAL_HOURS` | 24 | File cleanup interval |
| `MAX_FILE_AGE_HOURS` | 48 | File retention period |

## 📚 API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/docs` | API documentation |
| `POST` | `/api/meetings/upload` | Upload audio file |
| `GET` | `/api/meetings` | List all meetings |
| `GET` | `/api/meetings/:id` | Get meeting details |
| `DELETE` | `/api/meetings/:id` | Delete meeting |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `audio_chunk` | Client → Server | Send audio data |
| `transcription_segment` | Server → Client | Receive transcription |
| `processing_status` | Server → Client | Processing updates |
| `error` | Server → Client | Error notifications |

### Example Usage

#### Upload Audio File
```bash
curl -X POST \
  -F "audio=@meeting.mp3" \
  -F "title=Team Meeting" \
  -F "language=id" \
  http://localhost:3001/api/meetings/upload
```

#### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3002');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

// Send audio chunk
const audioData = new ArrayBuffer(1024);
ws.send(audioData);
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests with coverage
npm test

# Watch mode for development
npm run test:watch

# CI mode
npm run test:ci
```

### Test Structure

```
src/__tests__/
├── unit/              # Unit tests for services
│   ├── audioProcessingService.test.ts
│   ├── transcriptionService.test.ts
│   └── summarizationService.test.ts
└── integration/       # API integration tests
    └── api.test.ts
```

### Coverage Requirements

- **Lines**: 90%+
- **Functions**: 90%+
- **Branches**: 90%+
- **Statements**: 90%+

## 🔒 Security

### Security Measures

- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: XSS and injection protection
- **CORS**: Configurable cross-origin policies
- **Helmet**: Security headers
- **File Upload**: Type and size validation
- **Error Handling**: No information leakage

### Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

## 📊 Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:3001/api/health

# Response
{
  "status": "healthy",
  "services": [
    {"name": "WebSocket Server", "status": "up"},
    {"name": "Audio Processing", "status": "up"}
  ],
  "uptime": 3600
}
```

### Metrics

- Request/response times
- Error rates by endpoint
- WebSocket connection counts
- File processing metrics
- Resource utilization

## 🐳 Docker

### Images

- **API**: Node.js 20 Alpine with audio processing
- **Redis**: Caching and session storage
- **Nginx**: Reverse proxy (production)

### Development

```bash
# Start with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# View logs
docker-compose logs -f api
```

### Production

```bash
# Production deployment
docker-compose --profile production up -d

# With monitoring
docker-compose --profile monitoring up -d

# Scale API instances
docker-compose up -d --scale api=3
```

## 🚨 Troubleshooting

### Common Issues

1. **Audio Processing Fails**:
   - Ensure FFmpeg is installed
   - Check audio file format support
   - Verify file permissions

2. **Transcription Errors**:
   - Validate OpenAI API key
   - Check rate limits
   - Ensure Whisper model availability

3. **WebSocket Disconnections**:
   - Check firewall settings
   - Verify port accessibility
   - Monitor connection heartbeat

4. **High Memory Usage**:
   - Adjust file cleanup intervals
   - Monitor concurrent processing
   - Check for memory leaks

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Test with curl
curl -v http://localhost:3001/api/health
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Run tests: `npm test`
4. Lint code: `npm run lint:fix`
5. Commit changes: `git commit -m 'Add new feature'`
6. Push branch: `git push origin feature/new-feature`
7. Submit pull request

### Development Workflow

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Check code quality
npm run lint
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔧 Support

For issues and questions:

1. Check [API Documentation](http://localhost:3001/api/docs)
2. Review [Health Status](http://localhost:3001/api/health)
3. Enable debug logging: `LOG_LEVEL=debug`
4. Check container logs: `docker-compose logs -f api`

---

**Version**: 1.0.0  
**Node.js**: 18+  
**License**: MIT