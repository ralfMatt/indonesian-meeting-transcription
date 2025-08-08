#!/usr/bin/env node

/**
 * Security Check Script for Indonesian Meeting Transcription App
 * 
 * This script validates security configuration and provides recommendations
 * for Indonesian SME companies before deploying to production.
 * 
 * Usage: node scripts/security-check.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class SecurityChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.recommendations = [];
    this.passed = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      error: `${colors.red}❌ ERROR${colors.reset}`,
      warning: `${colors.yellow}⚠️  WARNING${colors.reset}`,
      success: `${colors.green}✅ SUCCESS${colors.reset}`,
      info: `${colors.blue}ℹ️  INFO${colors.reset}`,
      recommendation: `${colors.magenta}💡 RECOMMENDATION${colors.reset}`
    };

    console.log(`${prefix[type]} ${message}`);
  }

  // Check if environment files exist
  checkEnvironmentFiles() {
    this.log('\n📁 Checking Environment Configuration Files...', 'info');
    
    const requiredFiles = [
      { path: '.env.example', description: 'Environment template' },
      { path: 'backend/.env.example', description: 'Backend environment template' },
      { path: 'frontend/.env.example', description: 'Frontend environment template' }
    ];

    requiredFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file.path);
      if (fs.existsSync(fullPath)) {
        this.log(`${file.description} found: ${file.path}`, 'success');
        this.passed.push(`Environment file: ${file.path}`);
      } else {
        this.log(`Missing ${file.description}: ${file.path}`, 'error');
        this.errors.push(`Missing environment file: ${file.path}`);
      }
    });

    // Check if production .env files exist (they shouldn't be in repo)
    const productionEnvFiles = [
      'backend/.env',
      'frontend/.env',
      '.env'
    ];

    productionEnvFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        this.log(`Production environment file detected: ${file}`, 'warning');
        this.warnings.push(`Production .env file should not be committed to repository: ${file}`);
      }
    });
  }

  // Check backend security configuration
  checkBackendSecurity() {
    this.log('\n🔒 Checking Backend Security Configuration...', 'info');
    
    const backendEnvExample = path.join(process.cwd(), 'backend/.env.example');
    if (!fs.existsSync(backendEnvExample)) {
      this.log('Backend .env.example not found, skipping backend security check', 'warning');
      return;
    }

    const envContent = fs.readFileSync(backendEnvExample, 'utf8');
    
    // Check for critical security variables
    const criticalVars = [
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'SESSION_SECRET'
    ];

    criticalVars.forEach(varName => {
      if (envContent.includes(`${varName}=`)) {
        this.log(`Security variable template found: ${varName}`, 'success');
        this.passed.push(`Security variable: ${varName}`);

        // Check if it's still using default/development values
        const devPatterns = [
          'dev-jwt-secret',
          'dev-encryption-key',
          'dev-session-secret',
          'change-in-production'
        ];

        const line = envContent.split('\n').find(line => line.startsWith(`${varName}=`));
        if (line && devPatterns.some(pattern => line.toLowerCase().includes(pattern))) {
          this.log(`${varName} is using development/placeholder value`, 'warning');
          this.warnings.push(`${varName} must be changed for production deployment`);
        }
      } else {
        this.log(`Missing critical security variable: ${varName}`, 'error');
        this.errors.push(`Missing security variable: ${varName}`);
      }
    });

    // Check for Supabase configuration
    const supabaseVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    supabaseVars.forEach(varName => {
      if (envContent.includes(`${varName}=`)) {
        this.log(`Supabase configuration found: ${varName}`, 'success');
        this.passed.push(`Supabase config: ${varName}`);
      } else {
        this.log(`Missing Supabase configuration: ${varName}`, 'warning');
        this.warnings.push(`Supabase configuration needed: ${varName}`);
      }
    });
  }

  // Check frontend security configuration
  checkFrontendSecurity() {
    this.log('\n🌐 Checking Frontend Security Configuration...', 'info');
    
    const frontendEnvExample = path.join(process.cwd(), 'frontend/.env.example');
    if (!fs.existsSync(frontendEnvExample)) {
      this.log('Frontend .env.example not found, skipping frontend security check', 'warning');
      return;
    }

    const envContent = fs.readFileSync(frontendEnvExample, 'utf8');
    
    // Check for security-related frontend variables
    const securityVars = [
      'REACT_APP_STRICT_SECURITY',
      'REACT_APP_SUPABASE_URL',
      'REACT_APP_SUPABASE_ANON_KEY'
    ];

    securityVars.forEach(varName => {
      if (envContent.includes(`${varName}=`)) {
        this.log(`Frontend security variable found: ${varName}`, 'success');
        this.passed.push(`Frontend security: ${varName}`);
      } else {
        this.log(`Missing frontend security variable: ${varName}`, 'warning');
        this.warnings.push(`Consider adding frontend security variable: ${varName}`);
      }
    });
  }

  // Check package dependencies for security vulnerabilities
  checkDependencies() {
    this.log('\n📦 Checking Package Dependencies...', 'info');
    
    const packageFiles = [
      'backend/package.json',
      'frontend/package.json'
    ];

    packageFiles.forEach(packageFile => {
      const fullPath = path.join(process.cwd(), packageFile);
      if (fs.existsSync(fullPath)) {
        const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        
        // Check for security-related packages
        const securityPackages = {
          backend: ['helmet', 'bcrypt', 'jsonwebtoken', 'express-rate-limit', 'cors'],
          frontend: ['@supabase/supabase-js']
        };

        const moduleType = packageFile.includes('backend') ? 'backend' : 'frontend';
        const requiredPackages = securityPackages[moduleType] || [];

        requiredPackages.forEach(pkg => {
          const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
          if (dependencies[pkg]) {
            this.log(`Security package found in ${moduleType}: ${pkg}@${dependencies[pkg]}`, 'success');
            this.passed.push(`Security package: ${pkg} (${moduleType})`);
          } else {
            this.log(`Missing security package in ${moduleType}: ${pkg}`, 'warning');
            this.warnings.push(`Consider installing security package: ${pkg} (${moduleType})`);
          }
        });

        this.log(`Package.json validated: ${packageFile}`, 'success');
      } else {
        this.log(`Package.json not found: ${packageFile}`, 'error');
        this.errors.push(`Missing package.json: ${packageFile}`);
      }
    });
  }

  // Check file permissions and structure
  checkFilePermissions() {
    this.log('\n🔐 Checking File Permissions and Structure...', 'info');
    
    const sensitiveFiles = [
      'backend/src/utils/security.ts',
      'backend/src/middleware/security.ts',
      'backend/.env.example',
      'frontend/.env.example'
    ];

    sensitiveFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        try {
          const stats = fs.statSync(fullPath);
          this.log(`Security file found: ${file}`, 'success');
          this.passed.push(`Security file: ${file}`);
          
          // Check if file is readable (basic permission check)
          fs.accessSync(fullPath, fs.constants.R_OK);
        } catch (error) {
          this.log(`Permission issue with file: ${file} - ${error.message}`, 'error');
          this.errors.push(`File permission error: ${file}`);
        }
      } else {
        this.log(`Security file not found: ${file}`, 'warning');
        this.warnings.push(`Security file missing: ${file}`);
      }
    });
  }

  // Generate production security recommendations
  generateProductionRecommendations() {
    this.log('\n💡 Production Security Recommendations for Indonesian SMEs...', 'info');
    
    const recommendations = [
      {
        title: 'Environment Variables',
        items: [
          'Generate strong JWT_SECRET (64+ characters) using crypto.randomBytes(32).toString("hex")',
          'Create unique ENCRYPTION_KEY (exactly 32 characters) for data encryption',
          'Set secure SESSION_SECRET for additional session protection',
          'Never commit .env files to version control'
        ]
      },
      {
        title: 'Database Security',
        items: [
          'Enable Row Level Security (RLS) in Supabase for data isolation',
          'Use service key only on backend, never expose in frontend',
          'Implement proper user roles and permissions',
          'Enable database backups and point-in-time recovery'
        ]
      },
      {
        title: 'HTTPS and SSL',
        items: [
          'Deploy with HTTPS enabled (required for Indonesian business compliance)',
          'Use proper SSL certificates (not self-signed)',
          'Enable HSTS (HTTP Strict Transport Security)',
          'Redirect all HTTP traffic to HTTPS'
        ]
      },
      {
        title: 'Indonesian Business Compliance',
        items: [
          'Implement data residency controls (keep Indonesian SME data in-country)',
          'Add audit logging for meeting access and modifications',
          'Enable user consent management for data processing',
          'Implement data retention policies per Indonesian regulations'
        ]
      },
      {
        title: 'Monitoring and Logging',
        items: [
          'Enable security event logging',
          'Set up error monitoring and alerting',
          'Implement rate limiting for API endpoints',
          'Monitor for suspicious activity patterns'
        ]
      }
    ];

    recommendations.forEach(section => {
      this.log(`\n${colors.cyan}📋 ${section.title}:${colors.reset}`, 'info');
      section.items.forEach(item => {
        console.log(`   • ${item}`);
        this.recommendations.push(`${section.title}: ${item}`);
      });
    });
  }

  // Generate secure environment variables for production
  generateSecureSecrets() {
    this.log('\n🔑 Generating Secure Production Secrets...', 'info');
    
    const secrets = {
      JWT_SECRET: crypto.randomBytes(32).toString('hex'),
      ENCRYPTION_KEY: crypto.randomBytes(16).toString('hex'), // 32 chars hex = 16 bytes
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      API_KEY: crypto.randomBytes(16).toString('hex')
    };

    this.log('Generated secure secrets for production:', 'success');
    Object.entries(secrets).forEach(([key, value]) => {
      console.log(`${colors.green}${key}${colors.reset}=${value}`);
    });

    this.log('\n⚠️  IMPORTANT: Copy these values to your production .env file and keep them secure!', 'warning');
    this.log('Never share these secrets or commit them to version control.', 'warning');
  }

  // Main security check runner
  async run() {
    console.log(`${colors.cyan}
🛡️  Indonesian Meeting Transcription App - Security Check
========================================================${colors.reset}`);

    this.checkEnvironmentFiles();
    this.checkBackendSecurity();
    this.checkFrontendSecurity();
    this.checkDependencies();
    this.checkFilePermissions();
    this.generateProductionRecommendations();
    this.generateSecureSecrets();

    // Final summary
    this.log('\n📊 Security Check Summary:', 'info');
    this.log(`✅ Passed: ${this.passed.length}`, 'success');
    this.log(`⚠️  Warnings: ${this.warnings.length}`, 'warning');
    this.log(`❌ Errors: ${this.errors.length}`, 'error');
    this.log(`💡 Recommendations: ${this.recommendations.length}`, 'recommendation');

    if (this.errors.length === 0) {
      this.log('\n🎉 Security check completed successfully! Your app is ready for Indonesian SME testing.', 'success');
      this.log('Remember to implement the production recommendations before going live.', 'info');
    } else {
      this.log('\n🚨 Security issues found that need attention before deployment.', 'error');
      this.log('Please fix the errors and run the security check again.', 'error');
    }

    // Return results for programmatic use
    return {
      passed: this.passed,
      warnings: this.warnings,
      errors: this.errors,
      recommendations: this.recommendations,
      isSecure: this.errors.length === 0
    };
  }
}

// Run security check if this script is called directly
if (require.main === module) {
  const checker = new SecurityChecker();
  checker.run().then(results => {
    process.exit(results.isSecure ? 0 : 1);
  }).catch(error => {
    console.error(`${colors.red}Security check failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = SecurityChecker;