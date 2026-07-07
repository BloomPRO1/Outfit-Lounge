export const env = {
  JWT_SECRET: process.env.WEBSITE_JWT_SECRET || 'dev-only-insecure-secret-change-me',
  JWT_EXPIRES_IN: process.env.WEBSITE_JWT_EXPIRES_IN || '30d',
};
