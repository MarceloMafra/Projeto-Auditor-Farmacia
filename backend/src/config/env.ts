import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '3306', 10),
    NAME: process.env.DB_NAME || 'auditor_db',
    USER: process.env.DB_USER || 'auditor_user',
    PASSWORD: process.env.DB_PASSWORD || 'auditor_password',
  },

  // OAuth
  OAUTH: {
    CLIENT_ID: process.env.OAUTH_CLIENT_ID || '',
    CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET || '',
    REDIRECT_URI: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  },

  // AWS S3
  AWS: {
    REGION: process.env.AWS_REGION || 'us-east-1',
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
    SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
    S3_BUCKET: process.env.AWS_S3_BUCKET || 'auditor-evidence-bucket',
  },

  // Email
  EMAIL: {
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
    FROM: process.env.SMTP_FROM || 'auditor@empresa.com',
  },

  // SMS (Twilio)
  SMS: {
    ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
    AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
    PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  },

  // ERP Integration
  ERP: {
    TYPE: process.env.ERP_TYPE || 'mysql',
    HOST: process.env.ERP_HOST || 'localhost',
    PORT: parseInt(process.env.ERP_PORT || '3306', 10),
    DATABASE: process.env.ERP_DATABASE || 'erp_db',
    USER: process.env.ERP_USER || 'erp_user',
    PASSWORD: process.env.ERP_PASSWORD || 'erp_password',
  },

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
} as const;

// Validate critical env vars
if (!env.DB.HOST) {
  throw new Error('DB_HOST is required');
}
