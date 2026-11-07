import { defineConfig } from '@playwright/test';

const ipv6 = process.env.OTS_TEST_IPV6 === '1';
const studioOrigin = ipv6 ? 'http://localhost:5173' : 'http://127.0.0.1:5173';
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: studioOrigin, viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure', ...(ipv6 ? { launchOptions: { args: ['--host-resolver-rules=MAP localhost [::1]'] } } : {}) },
  webServer: { command: `npm exec -- vite preview --host ${ipv6 ? '::1' : '127.0.0.1'} --port 5173 --strictPort`, url: ipv6 ? 'http://[::1]:5173' : studioOrigin, reuseExistingServer: false },
});
