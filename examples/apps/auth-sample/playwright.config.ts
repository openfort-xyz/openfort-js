import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Alternatively, read from "../my.env" file.
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

const allDevicesTestMatch = ['**/base.spec.ts', '**/auth.spec.ts', '**/linkedSocials.spec.ts']

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* CI runners are slower than local, especially for embedded-wallet
   * operations that hit the network — give each test a larger budget. */
  timeout: process.env.CI ? 90_000 : 30_000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters
   * CI uses non-file reporters: workflow artifacts on a public repository are
   * downloadable by anyone, and the HTML report embeds trace attachments that
   * include request metadata. `github` surfaces failures as inline PR
   * annotations (message, stack and snippet), which covers triage without
   * writing files. Traces are still collected locally, where `html` is used. */
  reporter: process.env.CI ? [['dot'], ['github']] : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Configure projects for major browsers */
  projects: [
    // Setup project
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared auth state.
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      // The connection-reliability stress suite runs in its own project (and
      // its own CI job): it uses fresh guest accounts, so unlike the rest of
      // the suite it doesn't touch the shared E2E account and can run in
      // parallel instead of extending this serial run.
      testIgnore: ['**/connectionReliability.spec.ts'],
    },

    {
      // Connection-reliability stress tests. Guest-account based: no setup
      // dependency, no shared auth state, safe to run with parallel workers
      // and concurrently with the main suite.
      name: 'reliability',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/connectionReliability.spec.ts'],
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Use prepared auth state.
        storageState: 'playwright/.auth/user.json',
      },
      testMatch: allDevicesTestMatch,
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // Use prepared auth state.
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: allDevicesTestMatch,
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //     storageState: 'playwright/.auth/user.json',
    //   },
    //   dependencies: ['setup'],
    //   testMatch: allDevicesTestMatch,
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: {
    //     ...devices['iPhone 15'],
    //     storageState: 'playwright/.auth/user.json',
    //   },
    //   dependencies: ['setup'],
    //   testMatch: allDevicesTestMatch,
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
  // outputDir: "playwright/.auth/",

  /* Run your local dev server before starting the tests */
  webServer: {
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
})
