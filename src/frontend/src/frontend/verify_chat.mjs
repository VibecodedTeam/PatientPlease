import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.route('**/auth/me', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: '1', name: 'Dev User' } }) }),
);

await page.goto('http://localhost:5173/game/main', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/claude-1000/-home-maciek-Scripts-patientPlease/614b93dc-af91-4f72-abb3-d670993b3538/scratchpad/mainview-scene.png' });

await page.getByRole('button', { name: 'Chat' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/claude-1000/-home-maciek-Scripts-patientPlease/614b93dc-af91-4f72-abb3-d670993b3538/scratchpad/mainview-chat.png' });

await browser.close();
console.log('done');
