import { test, expect } from '@playwright/test';

test('front desk can open the authenticated workspace', async ({ page }) => {
  const login = await page.request.post('http://localhost:4000/api/auth/login', { data: { email: 'frontdesk@medislot.local', password: 'medislot-demo' } });
  const session = await login.json();
  await page.addInitScript((value) => { localStorage.setItem('medislot-token', value.token); localStorage.setItem('medislot-user', JSON.stringify(value.user)); }, session);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('button', { name: 'Appointments', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create appointment' })).toBeVisible();
  await page.getByRole('button', { name: 'Doctors' }).click();
  await expect(page.getByRole('heading', { name: 'Schedule timeline' })).toBeVisible();
  await page.getByRole('button', { name: 'AI Assistant' }).click();
  await expect(page.getByRole('heading', { name: 'Ask your front desk assistant' })).toBeVisible();
});
