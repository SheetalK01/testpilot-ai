#!/usr/bin/env node
/**
 * Captures the README screenshots (light and dark) and the demo GIF with Playwright.
 *
 * The app must be running (scripts/dev-local.sh or docker compose up). Demo data is created
 * through the API for a fresh user, so the script can be re-run at any time.
 *
 *   node scripts/capture-screenshots.js                      # app at http://localhost:3000
 *   BASE_URL=http://localhost:5173 node scripts/capture-screenshots.js
 *
 * The GIF needs ffmpeg on the PATH; without it the screenshots are still produced.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Playwright is installed in the e2e package; resolve it from there.
const { chromium, request } = createRequire(join(ROOT, 'e2e', 'package.json'))('@playwright/test');

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = join(ROOT, 'docs', 'screenshots');
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const STORIES = [
  {
    title: 'User login',
    description:
      'As a registered user, I want to log in with my email and password so that I can see my dashboard.',
    acceptanceCriteria:
      'Valid credentials open the dashboard\nA wrong password shows "Invalid email or password"\nEmail and password are required\nThe account locks after 5 failed attempts',
  },
  {
    title: 'Cart checkout',
    description: 'As a shopper, I want to check out the items in my cart so that I can buy them.',
    acceptanceCriteria:
      'Checkout shows items, quantities and the total including tax\nA declined card shows an error and keeps the cart\nAn empty cart cannot be checked out',
  },
  {
    title: 'Password reset',
    description: 'As a user who forgot my password, I want to reset it by email so that I can regain access.',
    acceptanceCriteria: 'A registered email receives a reset link\nThe link expires after 30 minutes',
  },
];

async function seed() {
  const api = await request.newContext({ baseURL: BASE_URL });
  const post = async (path, data, token) => {
    const response = await api.post(`/api${path}`, {
      data,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok()) throw new Error(`${path} -> ${response.status()} ${await response.text()}`);
    return response.json();
  };

  const { token } = await post('/auth/register', {
    name: 'Sheetal Khadanga',
    email: `demo-${randomUUID().slice(0, 8)}@example.com`,
    password: 'Password123',
  });
  const shop = await post('/projects', { name: 'Web Shop', description: 'Checkout, cart and account flows for the online store.' }, token);
  await post('/projects', { name: 'Admin Portal', description: 'Back-office user and order management.' }, token);
  await post('/projects', { name: 'Mobile API', description: 'REST API used by the iOS and Android apps.' }, token);

  const storyIds = [];
  for (const story of STORIES) {
    const created = await post(`/projects/${shop.id}/stories`, story, token);
    storyIds.push(created.id);
  }
  // Generate for the first two stories; the third is left empty for the live demo.
  for (const id of storyIds.slice(0, 2)) await post(`/stories/${id}/generate`, undefined, token);
  await post(
    `/stories/${storyIds[0]}/test-cases`,
    {
      title: 'Remember me keeps the session after a browser restart',
      type: 'EDGE',
      priority: 'LOW',
      preconditions: 'User account exists',
      steps: ['Tick "Remember me"', 'Log in', 'Close and reopen the browser'],
      expectedResult: 'The user is still logged in',
    },
    token,
  );
  await api.dispose();
  return { token, projectId: shop.id, storyIds };
}

async function newPage(browser, { token, theme, viewport = DESKTOP, video }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: theme,
    reducedMotion: video ? 'no-preference' : 'reduce',
    ...(video ? { recordVideo: { dir: video, size: viewport } } : {}),
  });
  if (token) await context.addInitScript((t) => localStorage.setItem('tp_token', t), token);
  return { context, page: await context.newPage() };
}

async function capture(browser, data, theme) {
  const shot = (page, name, fullPage = false) =>
    page.screenshot({ path: join(OUT, `${name}-${theme}.png`), fullPage, animations: 'disabled' });

  const anon = await newPage(browser, { theme });
  await anon.page.goto(BASE_URL);
  await anon.page.getByTestId('landing-cta').waitFor();
  await shot(anon.page, 'landing');
  await anon.page.goto(`${BASE_URL}/login`);
  await shot(anon.page, 'login');
  await anon.context.close();

  const { context, page } = await newPage(browser, { token: data.token, theme });
  await page.goto(BASE_URL);
  await page.getByTestId('recent-run').first().waitFor();
  await shot(page, 'dashboard', true);

  await page.goto(`${BASE_URL}/projects/${data.projectId}`);
  await page.getByTestId('story-row').first().waitFor();
  await shot(page, 'project');

  await page.goto(`${BASE_URL}/stories/${data.storyIds[0]}`);
  await page.getByTestId('test-case-row').first().waitFor();
  await page.getByTestId('test-case-title').first().click();
  await shot(page, 'story', true);

  await page.getByTestId('playwright-button').click();
  await page.getByTestId('playwright-script').waitFor();
  await page.getByTestId('playwright-script').scrollIntoViewIfNeeded();
  await shot(page, 'playwright');
  await context.close();

  const mobile = await newPage(browser, { token: data.token, theme, viewport: MOBILE });
  await mobile.page.goto(`${BASE_URL}/stories/${data.storyIds[0]}`);
  await mobile.page.getByTestId('test-case-row').first().waitFor();
  await shot(mobile.page, 'mobile-story');
  await mobile.context.close();
}

/** Records generate -> animation -> results -> Playwright and converts it to an optimised GIF. */
async function recordDemo(browser, data) {
  const videoDir = mkdtempSync(join(tmpdir(), 'tp-demo-'));
  const viewport = { width: 1280, height: 760 };
  const { context, page } = await newPage(browser, { token: data.token, theme: 'light', viewport, video: videoDir });

  await page.goto(`${BASE_URL}/stories/${data.storyIds[2]}`);
  await page.getByTestId('generate-button').waitFor();
  await page.waitForTimeout(1200);
  await page.getByTestId('generate-button').click();
  await page.getByTestId('test-case-row').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1800);
  await page.getByTestId('type-filter-NEGATIVE').click();
  await page.waitForTimeout(1200);
  await page.getByTestId('type-filter-ALL').click();
  await page.getByTestId('test-case-title').first().click();
  await page.waitForTimeout(1400);
  await page.getByTestId('playwright-button').click();
  await page.getByTestId('playwright-script').waitFor();
  await page.getByTestId('playwright-script').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2200);
  await context.close();

  const [video] = readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  try {
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', join(videoDir, video),
      '-vf', 'fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
      join(OUT, 'demo.gif'),
    ]);
    console.log('Wrote docs/screenshots/demo.gif');
  } catch {
    console.warn('ffmpeg not found or failed: skipped demo.gif (screenshots were still written).');
  } finally {
    rmSync(videoDir, { recursive: true, force: true });
  }
}

mkdirSync(OUT, { recursive: true });
const data = await seed();
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) await capture(browser, data, theme);
  console.log(`Wrote screenshots to ${OUT}`);
  await recordDemo(browser, data);
} finally {
  await browser.close();
}
