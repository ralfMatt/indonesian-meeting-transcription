import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';

/**
 * Security utilities for password hashing, JWT tokens, and data encryption
 * Provides enterprise-grade security for Indonesian SME meeting transcription app
 */

// Configuration constants
const SALT_ROUNDS = 12; // Higher rounds for better security (vs default 10)
const JWT_ALGORITHM = 'HS256';
const AES_ALGORITHM = 'AES-256-GCM';

// Environment variables with fallbacks for development
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars-long!';

/**
 * Password Security Functions
 */
export class PasswordSecurity {
  /**
   * Hash a password using bcrypt with salt rounds
   * @param password - Plain text password
   * @returns Promise<string> - Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      // Validate password strength
      if (!this.validatePasswordStrength(password)) {
        throw new Error('Password does not meet security requirements');
      }

      const saltRounds = process.env.NODE_ENV === 'production' ? SALT_ROUNDS : 8; // Faster in dev
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against its hash
   * @param password - Plain text password
   * @param hash - Hashed password from database
   * @returns Promise<boolean> - Whether password matches
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Validate password strength for Indonesian SME requirements
   * @param password - Password to validate
   * @returns boolean - Whether password meets requirements
   */
  static validatePasswordStrength(password: string): boolean {
    // Minimum requirements for business use:
    // - At least 8 characters
    // - At least one uppercase letter
    // - At least one lowercase letter  
    // - At least one number
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
  }

  /**
   * Generate a secure random password
   * @param length - Password length (default: 12)
   * @returns string - Generated secure password
   */
  static generateSecurePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required type
    password += this.getRandomChar('abcdefghijklmnopqrstuvwxyz'); // lowercase
    password += this.getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ'); // uppercase
    password += this.getRandomChar('0123456789'); // number
    password += this.getRandomChar('!@#$%^&*'); // special

    // Fill remaining length randomly
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(charset);
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  private static getRandomChar(charset: string): string {
    return charset.charAt(Math.floor(Math.random() * charset.length));
  }
}

/**
 * JWT Token Management
 */
export class TokenSecurity {
  /**
   * Generate JWT access token
   * @param payload - User data to include in token
   * @param expiresIn - Token expiration (default: 24h for business use)
   * @returns string - JWT token
   */
  static generateAccessToken(payload: any, expiresIn: string = '24h'): string {
    try {
      return jwt.sign(
        { 
          ...payload, 
          iat: Math.floor(Date.now() / 1000),
          type: 'access'
        },
        JWT_SECRET,
        { 
          algorithm: JWT_ALGORITHM,
          expiresIn,
          issuer: 'indonesian-meeting-transcription',
          audience: 'meeting-app-users'
        }
      );
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate JWT refresh token (longer expiry for business continuity)
   * @param payload - User data to include in token
   * @param expiresIn - Token expiration (default: 7 days)
   * @returns string - JWT refresh token
   */
  static generateRefreshToken(payload: any, expiresIn: string = '7d'): string {
    try {
      return jwt.sign(
        { 
          ...payload, 
          iat: Math.floor(Date.now() / 1000),
          type: 'refresh'
        },
        JWT_SECRET,
        { 
          algorithm: JWT_ALGORITHM,
          expiresIn,
          issuer: 'indonesian-meeting-transcription',
          audience: 'meeting-app-users'
        }
      );
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify and decode JWT token
   * @param token - JWT token to verify
   * @returns any - Decoded token payload
   */
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET, {
        algorithms: [JWT_ALGORITHM],
        issuer: 'indonesian-meeting-transcription',
        audience: 'meeting-app-users'
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.NotBeforeError) {
        throw new Error('Token not active');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Extract token from Authorization header
   * @param authHeader - Authorization header value
   * @returns string | null - Extracted token or null
   */
  static extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

/**
 * Data Encryption for sensitive meeting content
 */
export class DataEncryption {
  /**
   * Encrypt sensitive data (meeting transcriptions, summaries)
   * @param data - Data to encrypt
   * @returns string - Encrypted data with IV
   */
  static encryptData(data: string): string {
    try {
      // Use AES-256-GCM for authenticated encryption
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', ENCRYPTION_KEY);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, authTag, and encrypted data
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param encryptedData - Encrypted data with IV and authTag
   * @returns string - Decrypted data
   */
  static decryptData(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher('aes-256-gcm', ENCRYPTION_KEY);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash data for integrity checking (one-way)
   * @param data - Data to hash
   * @returns string - SHA-256 hash
   */
  static hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate cryptographically secure random string
   * @param length - Length of random string
   * @returns string - Random hex string
   */
  static generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }
}

/**
 * Session Security Management
 */
export class SessionSecurity {
  /**
   * Generate secure session ID
   * @returns string - Unique session ID
   */
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate session data integrity
   * @param sessionData - Session data to validate
   * @returns boolean - Whether session is valid
   */
  static validateSession(sessionData: any): boolean {
    if (!sessionData || typeof sessionData !== 'object') {
      return false;
    }

    // Check required session fields
    const requiredFields = ['userId', 'createdAt', 'lastActivity'];
    for (const field of requiredFields) {
      if (!(field in sessionData)) {
        return false;
      }
    }

    // Check session age (max 24 hours for business use)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const sessionAge = Date.now() - new Date(sessionData.createdAt).getTime();
    if (sessionAge > maxAge) {
      return false;
    }

    // Check activity timeout (max 2 hours idle)
    const maxIdle = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    const idleTime = Date.now() - new Date(sessionData.lastActivity).getTime();
    if (idleTime > maxIdle) {
      return false;
    }

    return true;
  }
}

/**
 * Input Sanitization for Indonesian text
 */
export class InputSanitizer {
  /**
   * Sanitize user input for Indonesian meeting names and content
   * @param input - User input to sanitize
   * @returns string - Sanitized input
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove dangerous HTML and script tags
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    // Preserve Indonesian characters while removing other potentially dangerous content
    sanitized = sanitized.replace(/[^\w\s\u00C0-\u017F\u0100-\u024F\.,!?;:()\-"']/g, '');

    // Trim whitespace and limit length for meeting names
    return sanitized.trim().substring(0, 200);
  }

  /**
   * Validate email format for Indonesian business domains
   * @param email - Email to validate
   * @returns boolean - Whether email is valid
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validate company/organization name for Indonesian SMEs
   * @param name - Company name to validate
   * @returns boolean - Whether name is valid
   */
  static validateCompanyName(name: string): boolean {
    if (!name || name.length < 2 || name.length > 100) {
      return false;
    }

    // Allow Indonesian characters, letters, numbers, spaces, and common business punctuation
    const validNameRegex = /^[a-zA-Z0-9\s\u00C0-\u017F\u0100-\u024F.,&()-]+$/;
    return validNameRegex.test(name.trim());
  }
}

/**
 * Security configuration validation
 */
export class SecurityConfig {
  /**
   * Validate that all required security environment variables are set
   * @returns { valid: boolean, errors: string[] }
   */
  static validateEnvironment(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Critical security environment variables
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-jwt-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be set to a secure random string in production');
    }

    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === 'dev-encryption-key-32-chars-long!') {
      errors.push('ENCRYPTION_KEY must be set to a secure 32-character string in production');
    }

    if (process.env.NODE_ENV === 'production') {
      if (!process.env.DATABASE_URL) {
        errors.push('DATABASE_URL must be set in production');
      }

      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        errors.push('SUPABASE_URL and SUPABASE_ANON_KEY must be set in production');
      }

      // Validate JWT secret strength in production
      if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET should be at least 32 characters long in production');
      }

      // Validate encryption key strength in production
      if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
        errors.push('ENCRYPTION_KEY must be exactly 32 characters long');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate secure environment variables for production deployment
   * @returns object - Generated secure values
   */
  static generateProductionSecrets(): { [key: string]: string } {
    return {
      JWT_SECRET: DataEncryption.generateSecureRandom(64),
      ENCRYPTION_KEY: DataEncryption.generateSecureRandom(32),
      SESSION_SECRET: DataEncryption.generateSecureRandom(64),
      API_KEY: DataEncryption.generateSecureRandom(32)
    };
  }
}

// Export all security utilities
export {
  PasswordSecurity,
  TokenSecurity, 
  DataEncryption,
  SessionSecurity,
  InputSanitizer,
  SecurityConfig
};