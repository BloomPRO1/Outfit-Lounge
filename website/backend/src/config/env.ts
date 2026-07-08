export const env = {
  JWT_SECRET: process.env.WEBSITE_JWT_SECRET || 'dev-only-insecure-secret-change-me',
  JWT_EXPIRES_IN: process.env.WEBSITE_JWT_EXPIRES_IN || '30d',
  ADMIN_JWT_SECRET: process.env.WEBSITE_ADMIN_JWT_SECRET || 'dev-only-insecure-admin-secret-change-me',
  ADMIN_JWT_EXPIRES_IN: process.env.WEBSITE_ADMIN_JWT_EXPIRES_IN || '7d',
};
