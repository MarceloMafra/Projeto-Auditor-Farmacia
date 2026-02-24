/**
 * Environment Configuration
 * Carrega variáveis de ambiente e valida
 */

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    console.warn(`⚠️  Environment variable ${key} not found, using default`);
  }
  return value || defaultValue || '';
};

export const env = {
  // Server
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: parseInt(getEnv('PORT', '3000'), 10),
  FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:5173'),

  // Database
  DB_HOST: getEnv('DB_HOST', 'localhost'),
  DB_PORT: parseInt(getEnv('DB_PORT', '3306'), 10),
  DB_USER: getEnv('DB_USER', 'root'),
  DB_PASSWORD: getEnv('DB_PASSWORD', ''),
  DB_NAME: getEnv('DB_NAME', 'auditor_digital'),
  DB_TYPE: getEnv('DB_TYPE', 'mysql'),
  MOCK_DATABASE: getEnv('MOCK_DATABASE', 'false').toLowerCase() === 'true',

  // ERP Connection
  ERP_HOST: getEnv('ERP_HOST', ''),
  ERP_PORT: parseInt(getEnv('ERP_PORT', '3306'), 10),
  ERP_USER: getEnv('ERP_USER', ''),
  ERP_PASSWORD: getEnv('ERP_PASSWORD', ''),
  ERP_DATABASE: getEnv('ERP_DATABASE', ''),

  // AWS S3
  AWS_REGION: getEnv('AWS_REGION', 'us-east-1'),
  AWS_ACCESS_KEY_ID: getEnv('AWS_ACCESS_KEY_ID', ''),
  AWS_SECRET_ACCESS_KEY: getEnv('AWS_SECRET_ACCESS_KEY', ''),
  AWS_S3_BUCKET: getEnv('AWS_S3_BUCKET', ''),

  // Email
  SMTP_HOST: getEnv('SMTP_HOST', ''),
  SMTP_PORT: parseInt(getEnv('SMTP_PORT', '587'), 10),
  SMTP_USER: getEnv('SMTP_USER', ''),
  SMTP_PASSWORD: getEnv('SMTP_PASSWORD', ''),
  SMTP_FROM: getEnv('SMTP_FROM', 'noreply@auditor-digital.com'),

  // Twilio
  TWILIO_ACCOUNT_SID: getEnv('TWILIO_ACCOUNT_SID', ''),
  TWILIO_AUTH_TOKEN: getEnv('TWILIO_AUTH_TOKEN', ''),
  TWILIO_PHONE: getEnv('TWILIO_PHONE', ''),

  // Auth
  JWT_SECRET: getEnv('JWT_SECRET', 'dev-secret-key'),
  SESSION_SECRET: getEnv('SESSION_SECRET', 'dev-session-key'),
};

export default env;
