import { expect, test } from '@playwright/test'

test.describe('ARIA application smoke coverage', () => {
  test('navigates through the core modules and renders graph and analytics views', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: 'Agent workspace' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Customer chat' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Knowledge base' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Support analytics' })).toBeVisible()
    await expect(page.getByText('Customer context', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Customer chat' }).click()
    await expect(page.getByRole('heading', { name: 'Customer chat' })).toBeVisible()

    await page.getByRole('button', { name: 'Knowledge base' }).click()
    await expect(page.getByRole('heading', { name: 'Business knowledge' })).toBeVisible()
    await page.getByRole('tab', { name: 'Graph Explorer' }).click()
    await expect(page.getByText('Knowledge Graph', { exact: true })).toBeVisible()
    await page.getByRole('textbox', { name: 'Search graph nodes' }).fill('refund')
    await expect(page.getByText(/matching node/)).toBeVisible()
    await page.locator('.graph-node').first().click()
    await expect(page.getByText('Reasoning paths', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Support analytics' }).click()
    await expect(page.getByRole('heading', { name: 'Support performance' })).toBeVisible()
    await expect(page.getByText('Answer quality report', { exact: true })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Analytics date range' })).toBeVisible()
    await page.getByRole('button', { name: 'Refresh analytics data' }).click()
    await expect(page.getByRole('button', { name: 'Refresh analytics data' })).toBeEnabled()
  })

  test('updates the Agent Workspace conversation search', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Unassigned conversations/ }).click()
    const search = page.getByRole('textbox', { name: 'Search conversations' })

    await expect(search).toBeVisible()
    await search.fill('refund')
    await expect(search).toHaveValue('refund')
    await expect(page.locator('.conversation-row').first()).toBeVisible()

    await search.fill('does-not-exist')
    await expect(page.getByText('No conversations match "does-not-exist".', { exact: true })).toBeVisible()
  })

  test('keeps Agent Workspace conversations independent when switching chats', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Unassigned conversations/ }).click()

    const conversations = page.locator('.conversation-row')
    await expect(conversations.nth(1)).toBeVisible({ timeout: 10_000 })
    await conversations.nth(0).click()
    const firstSubject = page.locator('.chat-header > div:nth-child(2) > span')
    await expect(firstSubject).toBeVisible()
    const firstSubjectText = await firstSubject.textContent()

    await conversations.nth(1).click()
    await expect(firstSubject).toBeVisible()
    await expect.poll(() => firstSubject.textContent()).not.toBe(firstSubjectText)
  })

  test('submits a customer question and renders an assistant response', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Customer chat' }).click()

    const question = page.getByRole('textbox', { name: 'Customer support question' })
    await question.fill('How long does a refund take after approval?')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByText('How long does a refund take after approval?', { exact: true })).toBeVisible()
    await expect(page.locator('.customer-bubble.bot')).toHaveCount(2, { timeout: 30_000 })
  })

  test('creates and deletes a knowledge record from the table', async ({ page }) => {
    const title = `Browser smoke knowledge ${Date.now()}`
    await page.goto('/')
    await page.getByRole('button', { name: 'Knowledge base' }).click()
    await page.getByRole('button', { name: 'Add knowledge' }).click()
    await page.getByRole('textbox', { name: 'Knowledge title' }).fill(title)
    await page.getByRole('textbox', { name: 'Knowledge answering note' }).fill('Temporary browser smoke record.')
    await page.getByRole('button', { name: 'Save knowledge' }).click()

    const row = page.locator('tr').filter({ hasText: title })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: `Delete ${title}` }).click()
    await expect(row).toHaveCount(0)
  })

  test('opens admin settings with user management controls', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('User management', { exact: true })).toBeVisible()
    await expect(page.getByText('Runtime metrics', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create user' })).toBeVisible()
  })

  test('opens the notification center and supports read-all state', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Notifications' }).click()

    const popover = page.locator('.notifications-popover')
    await expect(popover).toBeVisible()
    await expect(popover.getByText('Notifications', { exact: false })).toBeVisible()

    const markAllRead = popover.getByRole('button', { name: 'Mark all read' })
    await expect(markAllRead).toBeVisible()
    if (await markAllRead.isEnabled()) {
      await markAllRead.click()
      await expect(markAllRead).toBeDisabled()
    }
  })

  test('records an ARIA assistant rejection as a learning action', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Action meaning', { exact: true })).toBeVisible()
    await expect(page.getByText('Reject records that the suggestion was not useful.', { exact: false })).toBeVisible()

    await page.getByRole('button', { name: 'Reject' }).click()
    await expect(page.locator('.action-status')).toHaveText('Rejected - negative feedback recorded')
  })

  test('records accepted and edited ARIA assistant actions', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Accept' }).click()
    await expect(page.locator('.action-status')).toHaveText('Accepted and recorded as positive feedback')

    await page.getByRole('button', { name: 'Edit & send' }).click()
    await expect(page.locator('.action-status')).toHaveText('Saved as an agent correction')
  })

})
