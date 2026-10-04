import { defineConfig } from '@playwright/test';
const port = Number(process.env.MVP_PORT ?? 4187);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, fullyParallel: false,
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : { channel: 'chromium' } },
  projects: [{ name: 'desktop', use: { viewport: { width: 1280, height: 900 } } }, { name: 'mobile-viewport', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
  ...(process.env.PLAYWRIGHT_NO_SERVER ? {} : { webServer: { command: `npm run preview -- --port ${port} --strictPort`, url: baseURL, reuseExistingServer: false } }),
});
