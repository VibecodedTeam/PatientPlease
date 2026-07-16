import { test, expect } from '@playwright/test';

test('frontend is running and serves the app shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Gra diagnostyczna chorób skóry');
  await expect(page.locator('#root')).toBeAttached();
});
