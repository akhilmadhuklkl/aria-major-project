import { expect, test } from '@playwright/test'

test.describe('ARIA application smoke coverage', () => {
  test('navigates through the core modules and renders graph and analytics views', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: 'Agent workspace' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Customer chat' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Knowledge base' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Support analytics' })).toBeVisible()

    await page.getByRole('button', { name: 'Customer chat' }).click()
    await expect(page.getByRole('heading', { name: 'Customer chat' })).toBeVisible()

    await page.getByRole('button', { name: 'Knowledge base' }).click()
    await expect(page.getByRole('heading', { name: 'Business knowledge' })).toBeVisible()
    await page.getByRole('tab', { name: 'Graph Explorer' }).click()
    await expect(page.getByText('Knowledge Graph', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Support analytics' }).click()
    await expect(page.getByRole('heading', { name: 'Support performance' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Analytics date range' })).toBeVisible()
    await page.getByRole('button', { name: 'Refresh analytics data' }).click()
    await expect(page.getByRole('button', { name: 'Refresh analytics data' })).toBeEnabled()
  })

  test('updates the Agent Workspace conversation search', async ({ page }) => {
    await page.goto('/')
    const search = page.getByRole('textbox', { name: 'Search conversations' })

    await expect(search).toBeVisible()
    await search.fill('Maya')
    await expect(search).toHaveValue('Maya')
    await expect(page.getByText('Maya Chen', { exact: true })).toBeVisible()

    await search.fill('does-not-exist')
    await expect(page.getByText('No conversations match "does-not-exist".', { exact: true })).toBeVisible()
  })

  test('opens admin settings with user management controls', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('User management', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create user' })).toBeVisible()
  })
})
