import { test, expect } from '@playwright/test';

test('front desk can open the authenticated workspace', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('medislot-token', 'e2e-placeholder');
    localStorage.setItem('medislot-user', JSON.stringify({ name: 'Front Desk', role: 'FRONT_DESK' }));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('button', { name: 'Appointments', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create appointment' })).toBeVisible();
  await page.getByRole('button', { name: 'Doctors' }).click();
  await expect(page.getByRole('heading', { name: 'Schedule timeline' })).toBeVisible();
  await page.getByRole('button', { name: 'AI Assistant' }).click();
  await expect(page.getByRole('heading', { name: 'Ask your front desk assistant' })).toBeVisible();
});
