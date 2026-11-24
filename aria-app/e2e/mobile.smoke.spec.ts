import { devices, expect, test } from '@playwright/test'

test.use({ ...devices['Pixel 5'] })

test('keeps primary navigation usable on a mobile viewport', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Agent workspace' })).toBeVisible()
  await page.getByRole('button', { name: 'Customer chat' }).click()
  await expect(page.getByRole('heading', { name: 'Customer chat' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Customer support question' })).toBeVisible()
})
