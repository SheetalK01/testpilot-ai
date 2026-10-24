#!/usr/bin/env node
/**
 * Records the captioned demo video (docs/demo/testpilot-demo.mp4) and the README GIF
 * (docs/screenshots/demo.gif) with Playwright. Use scripts/record-demo.sh, which starts the app first.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = createRequire(join(ROOT, 'e2e', 'package.json'))('@playwright/test');

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const MP4 = join(ROOT, 'docs', 'demo', 'testpilot-demo.mp4');
const GIF = join(ROOT, 'docs', 'screenshots', 'demo.gif');
const SIZE = { width: 1280, height: 720 };

/** Shows a caption in the bottom-left corner, so the silent video explains itself. */
async function caption(page, text) {
  await page.evaluate((value) => {
    let el = document.getElementById('demo-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-caption';
      Object.assign(el.style, {
        position: 'fixed', left: '24px', bottom: '24px', zIndex: 9999, maxWidth: '640px',
        padding: '12px 18px', borderRadius: '14px', font: '600 18px Inter Variable, system-ui, sans-serif',
        color: '#fff', background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
        boxShadow: '0 12px 32px -8px rgba(15,23,42,.45)', transition: 'opacity .25s',
      });
      document.body.appendChild(el);
    }
    el.textContent = value;
  }, text);
}

const pause = (page, ms) => page.waitForTimeout(ms);

async function record() {
  const videoDir = mkdtempSync(join(tmpdir(), 'tp-video-'));
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    recordVideo: { dir: videoDir, size: SIZE },
  });
  const page = await context.newPage();

  await page.goto(BASE_URL);
  await page.getByTestId('landing-cta').waitFor();
  await caption(page, 'TestPilot AI turns plain-English user stories into test cases');
  await pause(page, 3000);

  await caption(page, 'Try it without signing up: a private demo workspace');
  await pause(page, 1500);
  await page.getByTestId('try-demo').click();
  await page.getByTestId('stat-projects').waitFor({ timeout: 180_000 });
  await caption(page, 'Dashboard: totals, coverage charts and every AI run');
  await pause(page, 3500);

  await page.getByTestId('project-card').first().click();
  await caption(page, 'A project groups the user stories of one product');
  await pause(page, 2500);
  await page.getByTestId('story-row').filter({ hasText: 'Password reset' }).click();
  await caption(page, 'A user story with acceptance criteria');
  await pause(page, 3000);

  await caption(page, 'One click: Claude writes positive, negative and edge cases');
  await page.getByTestId('generate-button').click();
  await page.getByTestId('test-case-row').first().waitFor({ timeout: 180_000 });
  await pause(page, 3000);

  await page.getByTestId('type-filter-NEGATIVE').click();
  await caption(page, 'Filter by type');
  await pause(page, 2000);
  await page.getByTestId('type-filter-ALL').click();
  await page.getByTestId('test-case-title').first().click();
  await caption(page, 'Every case has preconditions, clear steps and an expected result');
  await pause(page, 3500);

  await page.getByTestId('playwright-button').click();
  await page.getByTestId('playwright-script').waitFor({ timeout: 180_000 });
  await page.getByTestId('playwright-script').scrollIntoViewIfNeeded();
  await caption(page, 'Export a ready-to-run Playwright script (or an Excel sheet)');
  await pause(page, 4500);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Dashboard' }).click();
  await page.getByTestId('stat-projects').waitFor();
  await caption(page, 'Turn user stories into test cases in seconds.');
  await pause(page, 3000);

  await context.close();
  await browser.close();
  const [webm] = readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  return { videoDir, webm: join(videoDir, webm) };
}

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
}

mkdirSync(dirname(MP4), { recursive: true });
const { videoDir, webm } = await record();
try {
  ffmpeg(['-i', webm, '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', MP4]);
  ffmpeg([
    '-i', webm,
    '-vf', 'fps=8,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
    GIF,
  ]);
  console.log(`Wrote ${MP4}\nWrote ${GIF}`);
} finally {
  rmSync(videoDir, { recursive: true, force: true });
}
