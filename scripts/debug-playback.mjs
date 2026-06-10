import { chromium } from 'playwright';

const BASE = process.env.PLAYBACK_TEST_URL ?? 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[TTS]')) {
      console.log(text);
    }
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });

  const issueLink = page.locator('button, a').filter({ hasText: /Morning Brew|issue|202/i }).first();
  if (await issueLink.count()) {
    await issueLink.click();
  } else {
    const today = new Date().toISOString().slice(0, 10);
    await page.goto(`${BASE}/issue/${today}`, { waitUntil: 'networkidle' });
  }

  await page.waitForTimeout(1500);

  const playButton = page.locator('button[aria-label="Play"]').first();
  await playButton.waitFor({ timeout: 10000 });
  console.log('--- First play ---');
  await playButton.click();
  await page.waitForTimeout(2000);

  const pauseButton = page.locator('button[aria-label="Pause"]').first();
  await pauseButton.waitFor({ timeout: 5000 });
  console.log('--- Pause ---');
  await pauseButton.click();
  await page.waitForTimeout(1000);

  const stateAfterPause = await page.evaluate(() => window.__TTS_DEBUG__?.());
  console.log('State after pause:', JSON.stringify(stateAfterPause, null, 2));

  console.log('--- Resume ---');
  await page.locator('button[aria-label="Play"]').first().click();
  await page.waitForTimeout(2000);

  const stateAfterResume = await page.evaluate(() => window.__TTS_DEBUG__?.());
  console.log('State after resume:', JSON.stringify(stateAfterResume, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
