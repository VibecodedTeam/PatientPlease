const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('http://localhost:5173/game/main', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/claude-1000/-home-maciek-Scripts-patientPlease/c151d444-1578-4337-a7f2-1df4b017295b/scratchpad/main.png', fullPage: true });
  console.log('errors:', errors);
  await browser.close();
})();
