# Multi-stage build for Indonesian Meeting Transcription API
FROM node:20-alpine AS builder

WORKDIR /app

# Install Python and system dependencies for audio processing
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    ffmpeg \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Install Whisper (placeholder - in production, use actual Whisper installation)
RUN pip3 install --no-cache-dir openai-whisper

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p uploads/audio uploads/processed logs models/whisper \
    && chown -R nodejs:nodejs uploads logs models

# Create health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:3001/api/health || exit 1' > /healthcheck.sh \
    && chmod +x /healthcheck.sh

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 3001 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /healthcheck.sh

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]

# Metadata
LABEL \
    org.opencontainers.image.title="Indonesian Meeting Transcription API" \
    org.opencontainers.image.description="Backend API for transcribing and summarizing Indonesian meeting recordings" \
    org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.authors="Meeting Transcription Team" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/company/meeting-transcription-app"