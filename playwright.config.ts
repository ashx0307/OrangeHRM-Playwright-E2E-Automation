import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/*
 * https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  timeout: 150_000,             // Same as 150000ms, but more readability for humans. This is the maximum time a test can run before being considered failed.
  expect: {
    timeout: 20_000,            // Same as 20000ms, but more readability for humans. This is the maximum time expect() should wait for the condition to be met.
  },
  fullyParallel: true,          // Run tests in files in parallel. Tests in a single file are run sequentially.
  forbidOnly: !!process.env.CI,           // Fail the build on CI if you accidentally left test.only in the source code.
  retries: process.env.CI ? 2 : 2,        // Retry on CI only. This is the number of times a test will be retried if it fails. Retry 2 times on both CI & Local
  // A single worker against a slow, shared public demo instance is more
  // reliable than parallelism fighting over its response times.
  workers: process.env.CI ? 2 : 1,
  // HTML for local triage, list for live console feedback, and JUnit XML so
  // CI systems that expect that format (Jenkins, Azure DevOps, GitHub's own
  // test-summary action) can ingest results without a separate conversion step.
  reporter: [['html', { open: 'never' }], ['list'], ['junit', { outputFile: 'test-results/junit.xml' }]],

  use: {
    baseURL: env.baseUrl,
    actionTimeout: 45_000,
    navigationTimeout: 90_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,                  // Set to true to run tests in headless mode in CI. Set to false to see the browser UI during test execution.
  },

  projects: [
    // Role provisioning: logs in as Admin, then persists the session's
    // storageState for every other project to reuse. 
    {
      name: 'setup-admin',
      testMatch: /setup\/admin\.setup\.ts/,
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup-admin'],
      testIgnore: /setup\/.*/,
    },

    // Cross-browser coverage — opt in with `--project=firefox` / `--project=webkit`.
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup-admin'],
      testIgnore: /setup\/.*/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup-admin'],
      testIgnore: /setup\/.*/,
    },
  ],
});
