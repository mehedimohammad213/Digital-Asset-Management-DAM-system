export interface TestEnv {
  email: string;
  password: string;
  baseUrl: string;
  folderName: string;
  testEmail: string;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getEnv(): TestEnv {
  return {
    email: requireEnv('MARCOMBOX_EMAIL'),
    password: requireEnv('MARCOMBOX_PASSWORD'),
    baseUrl: process.env.MARCOMBOX_BASE_URL?.trim() || 'https://qatest.marcombox.com',
    folderName: process.env.USER_FOLDER_NAME?.trim() || 'mehedi',
    testEmail: process.env.TEST_EMAIL?.trim() || requireEnv('MARCOMBOX_EMAIL'),
  };
}
