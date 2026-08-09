// Centralized Configuration Management
// Responsible for Configuration Management and Environment Abstraction

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  baseUrl: process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com/web/index.php',
  adminUsername: process.env.ADMIN_USERNAME ?? 'Admin',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123',
};

export const authFile = {
  admin: path.resolve(__dirname, '../../playwright/.auth/admin.json'),
};
