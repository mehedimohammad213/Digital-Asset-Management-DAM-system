import { chromium, type FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getEnv } from './src/config/env';
import { LoginPage } from './src/pages/LoginPage';

async function globalSetup(_config: FullConfig): Promise<void> {
  dotenv.config();

  const authDir = path.join(__dirname, '.auth');
  fs.mkdirSync(authDir, { recursive: true });
  const storagePath = path.join(authDir, 'user.json');

  const env = getEnv();
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: env.baseUrl });
  const page = await context.newPage();

  const loginPage = new LoginPage(page);
  await loginPage.login(env.email, env.password);

  await context.storageState({ path: storagePath });
  await browser.close();
}

export default globalSetup;
