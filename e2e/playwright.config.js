// @ts-check
import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);
export const FRONTEND_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const AI_ENGINE_URL = 'http://localhost:8000';

const backendJar = '../testpilot_backend/target/testpilot-backend.jar';
const backendCommand = existsSync(backendJar)
  ? `java -jar ${backendJar}`
  : 'cd ../testpilot_backend && ./mvnw -q spring-boot:run';
const python = process.env.AI_ENGINE_PYTHON ?? '.venv/bin/python';

/**
 * One command starts the whole stack (AI engine in mock mode, backend on H2, Vite frontend) unless
 * it is already running, so `npx playwright test` works from a fresh clone and in CI.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },
  projects: [
    {
      name: 'ui',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'], permissions: ['clipboard-read', 'clipboard-write'] },
    },
    { name: 'api', testDir: './tests/api', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'a11y',
      testDir: './tests/a11y',
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
    },
    {
      name: 'visual',
      testDir: './tests/visual',
      snapshotPathTemplate: '{testDir}/__snapshots__/{platform}/{arg}{ext}',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        reducedMotion: 'reduce',
      },
      expect: {
        toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
      },
    },
  ],
  // When E2E_BASE_URL points at an already running stack (e.g. docker compose), start nothing.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          name: 'ai-engine',
          command: `${python} -m uvicorn app.main:app --port 8000`,
          cwd: '../ai_engine',
          url: `${AI_ENGINE_URL}/health`,
          env: { AI_MODE: 'mock', MOCK_DELAY_SECONDS: '0.8' },
          reuseExistingServer: !CI,
          timeout: 60_000,
        },
        {
          name: 'backend',
          command: backendCommand,
          url: `${API_URL}/actuator/health`,
          env: { AI_ENGINE_URL },
          reuseExistingServer: !CI,
          timeout: 180_000,
        },
        {
          name: 'frontend',
          command: 'npm run dev -- --port 5173 --strictPort',
          cwd: '../frontend',
          url: FRONTEND_URL,
          reuseExistingServer: !CI,
          timeout: 60_000,
        },
      ],
});
