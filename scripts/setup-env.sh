#!/bin/bash

# =================================================================
# Environment Setup Script for Indonesian Meeting Transcription
# =================================================================
# For solo entrepreneurs with no development experience
# Generates secure production secrets automatically
# =================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}
🔧 Indonesian Meeting Transcription - Environment Setup
=======================================================${NC}"
echo "This script will generate secure secrets for your production deployment."
echo "Perfect for solo entrepreneurs - no coding knowledge required! 👨‍💼"
echo ""

# Function to generate secure random string
generate_secret() {
    local length=$1
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex $length
    else
        node -e "console.log(require('crypto').randomBytes($length).toString('hex'))"
    fi
}

echo -e "${YELLOW}🔑 Generating production-ready secrets...${NC}"
echo ""

# Generate secrets
JWT_SECRET=$(generate_secret 32)
ENCRYPTION_KEY=$(generate_secret 16) 
SESSION_SECRET=$(generate_secret 32)
API_KEY=$(generate_secret 16)

echo -e "${GREEN}✅ Secrets generated successfully!${NC}"
echo ""
echo -e "${PURPLE}🔐 YOUR PRODUCTION SECRETS (KEEP THESE SAFE!):${NC}"
echo "=============================================="
echo ""
echo -e "${CYAN}# Backend Environment Variables (Railway)${NC}"
echo "JWT_SECRET=$JWT_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "SESSION_SECRET=$SESSION_SECRET"
echo "NODE_ENV=production"
echo "CORS_ORIGIN=https://your-frontend-url.vercel.app"
echo ""
echo -e "${CYAN}# Add these when you get your API keys:${NC}"
echo "OPENAI_API_KEY=sk-your-openai-api-key-here"
echo "SUPABASE_URL=https://your-project-id.supabase.co"  
echo "SUPABASE_ANON_KEY=your-supabase-anon-key"
echo "SUPABASE_SERVICE_KEY=your-supabase-service-key"
echo ""

# Save to file for reference
cat > .env.production << EOF
# Indonesian Meeting Transcription - Production Environment
# Generated on $(date)
# KEEP THESE SECRETS SAFE - DO NOT SHARE OR COMMIT TO GIT!

# ===== SECURITY SECRETS =====
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
SESSION_SECRET=$SESSION_SECRET

# ===== DEPLOYMENT SETTINGS =====
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-url.vercel.app

# ===== API KEYS (Fill these in) =====
OPENAI_API_KEY=sk-your-openai-api-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key  
SUPABASE_SERVICE_KEY=your-supabase-service-key

# ===== OPTIONAL SETTINGS =====
API_KEY=$API_KEY
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=100MB
FORCE_HTTPS=true
TRUST_PROXY=true

# ===== INDONESIAN BUSINESS SETTINGS =====
DEFAULT_TIMEZONE=Asia/Jakarta
DEFAULT_LANGUAGE=id
ENABLE_INDONESIAN_FEATURES=true
MAX_USERS_PER_COMPANY=10
MAX_MEETINGS_PER_MONTH=100
EOF

echo -e "${GREEN}✅ Secrets saved to: .env.production${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY NOTES:${NC}"
echo "1. These secrets are for PRODUCTION only"
echo "2. Never share these secrets with anyone"
echo "3. Never commit .env.production to Git"
echo "4. Keep a backup of these secrets somewhere safe"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Copy the environment variables above"
echo "2. Follow DEPLOYMENT-GUIDE.md step by step"
echo "3. Paste these secrets into Railway (backend) environment"
echo "4. Your app will be secure and ready for Indonesian SME testing!"
echo ""
echo -e "${GREEN}🎉 Environment setup complete! Ready for deployment.${NC}"