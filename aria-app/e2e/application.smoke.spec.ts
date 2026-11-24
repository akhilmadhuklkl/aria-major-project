import { expect, test } from '@playwright/test'

test.describe('ARIA application smoke coverage', () => {
  test('completes first-time admin setup from the authentication screen', async ({ page }) => {
    const user = { id: 1, email: 'admin@example.com', displayName: 'Browser Admin', role: 'admin' }
    await page.route('**/api/health', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authRequired: true, authSetupAvailable: true }) })
    })
    await page.route('**/api/auth/bootstrap', async (route) => {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ user, token: 'browser-smoke-token', expiresAt: new Date(Date.now() + 60_000).toISOString() }) })
    })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await page.getByRole('button', { name: 'First-time setup' }).click()
    await expect(page.getByRole('heading', { name: 'Set up your admin account' })).toBeVisible()

    await page.getByRole('textbox', { name: 'Display name' }).fill('Browser Admin')
    await page.getByRole('textbox', { name: 'Email address' }).fill('admin@example.com')
    await page.getByLabel('Password').fill('browser-password-123')
    await page.getByRole('button', { name: 'Create admin account' }).click()
    await expect(page.getByRole('button', { name: 'Agent workspace' })).toBeVisible()
  })

  test('signs in an existing administrator from the authentication screen', async ({ page }) => {
    const user = { id: 2, email: 'agent@example.com', displayName: 'Existing Admin', role: 'admin' }
    await page.route('**/api/health', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authRequired: true, authSetupAvailable: false }) })
    })
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user, token: 'browser-login-token', expiresAt: new Date(Date.now() + 60_000).toISOString() }) })
    })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await page.getByRole('textbox', { name: 'Email address' }).fill('agent@example.com')
    await page.getByLabel('Password').fill('browser-password-123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('button', { name: 'Agent workspace' })).toBeVisible()
  })

  test('signs out and returns to the authentication screen', async ({ page }) => {
    const user = { id: 3, email: 'logout@example.com', displayName: 'Logout Admin', role: 'admin' }
    await page.route('**/api/health', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authRequired: true, authSetupAvailable: false }) })
    })
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user, token: 'browser-logout-token', expiresAt: new Date(Date.now() + 60_000).toISOString() }) })
    })
    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({ status: 204 })
    })
    await page.goto('/')
    await page.getByRole('textbox', { name: 'Email address' }).fill('logout@example.com')
    await page.getByLabel('Password').fill('browser-password-123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('button', { name: 'Agent workspace' })).toBeVisible()

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })

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

  test('bulk selects and deletes knowledge records', async ({ page }) => {
    const firstTitle = `Browser bulk knowledge A ${Date.now()}`
    const secondTitle = `${firstTitle} B`
    await page.goto('/')
    await page.getByRole('button', { name: 'Knowledge base' }).click()

    for (const title of [firstTitle, secondTitle]) {
      await page.getByRole('button', { name: 'Add knowledge' }).click()
      await page.getByRole('textbox', { name: 'Knowledge title' }).fill(title)
      await page.getByRole('textbox', { name: 'Knowledge answering note' }).fill('Temporary bulk browser smoke record.')
      await page.getByRole('button', { name: 'Save knowledge' }).click()
      await expect(page.locator('tr').filter({ hasText: title })).toBeVisible()
    }

    await page.getByRole('checkbox', { name: `Select ${firstTitle}`, exact: true }).check()
    await page.getByRole('checkbox', { name: `Select ${secondTitle}`, exact: true }).check()
    await expect(page.getByText('2 selected', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Delete selected' }).click()
    await expect(page.locator('tr').filter({ hasText: firstTitle })).toHaveCount(0)
    await expect(page.locator('tr').filter({ hasText: secondTitle })).toHaveCount(0)

    await page.reload()
    await page.getByRole('button', { name: 'Knowledge base' }).click()
    await expect(page.locator('tr').filter({ hasText: firstTitle })).toHaveCount(0)
    await expect(page.locator('tr').filter({ hasText: secondTitle })).toHaveCount(0)
  })

  test('selects and clears all visible knowledge records from the header', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Knowledge base' }).click()

    const selectAll = page.getByRole('checkbox', { name: 'Select all visible knowledge records' })
    await selectAll.check()
    await expect(selectAll).toBeChecked()
    await expect(page.getByText(/^\d+ selected$/)).toBeVisible()

    await selectAll.uncheck()
    await expect(selectAll).not.toBeChecked()
    await expect(page.getByText(/^\d+ selected$/)).toHaveCount(0)
  })

  test('filters Knowledge Base records by search, category, and status', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Knowledge base' }).click()

    const rows = page.locator('tbody tr')
    await page.getByRole('combobox', { name: 'Filter by category' }).selectOption('Policy')
    await expect(rows.filter({ hasText: 'Refund and return policy' })).toBeVisible()
    await expect(rows.filter({ hasText: 'Subscription terms' })).toBeVisible()
    await expect(rows.filter({ hasText: 'Order delivery FAQ' })).toHaveCount(0)

    await page.getByRole('combobox', { name: 'Filter by status' }).selectOption('Indexed')
    await expect(rows.filter({ hasText: 'Subscription terms' })).toBeVisible()
    await expect(rows.filter({ hasText: 'Refund and return policy' })).toBeVisible()

    await page.getByRole('combobox', { name: 'Filter by status' }).selectOption('Review')
    await expect(page.getByText('No knowledge records match the current search and filters.', { exact: true })).toBeVisible()

    await page.getByRole('combobox', { name: 'Filter by category' }).selectOption('all')
    await page.getByRole('combobox', { name: 'Filter by status' }).selectOption('all')
    await page.getByRole('textbox', { name: 'Search knowledge' }).fill('password')
    await expect(rows.filter({ hasText: 'Password reset procedure' })).toBeVisible()
    await expect(rows.filter({ hasText: 'Refund and return policy' })).toHaveCount(0)
  })

  test('opens admin settings with user management controls', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('User management', { exact: true })).toBeVisible()
    await expect(page.getByText('Runtime metrics', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create user' })).toBeVisible()
  })

  test('creates and deletes a webhook integration from Settings', async ({ page }) => {
    const name = `Browser Smoke Webhook ${Date.now()}`
    const url = `https://example.com/aria-smoke-${Date.now()}`
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()

    await page.getByRole('textbox', { name: 'Webhook integration name' }).fill(name)
    await page.getByRole('textbox', { name: 'Webhook HTTPS URL' }).fill(url)
    await page.getByRole('combobox', { name: 'Webhook event' }).selectOption('feedback.low_rating')
    await page.getByRole('button', { name: 'Add webhook' }).click()

    const row = page.locator('.webhook-row').filter({ hasText: name })
    await expect(row).toBeVisible()
    await expect(row).toContainText('feedback.low_rating')

    page.once('dialog', (dialog) => void dialog.accept())
    await row.getByRole('button', { name: `Delete ${name}` }).click()
    await expect(row).toHaveCount(0)
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

  test('marks an individual notification as read', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Reject' }).click()
    await expect(page.locator('.action-status')).toHaveText('Rejected - negative feedback recorded')
    await page.reload()
    await page.getByRole('button', { name: 'Notifications' }).click()

    const notification = page.getByRole('button', { name: /AI response rejected/ }).first()
    await expect(notification).toBeVisible()
    await expect(notification).toHaveClass(/notification-item/)
    await notification.click()
    await expect(notification).toHaveClass(/read/)
    await expect(notification).not.toContainText('Unread')
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

  test('regenerates the ARIA assistant draft', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Regenerate' }).click()
    await expect(page.locator('.action-status')).toHaveText('Regenerated just now')
  })

  test('exports the selected Agent Workspace conversation', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Conversation options' }).click()
    await expect(page.getByRole('button', { name: 'Download conversation' })).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download conversation' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^aria-conversation-\d+\.txt$/)
  })

  test('updates conversation status and tags from Agent Workspace', async ({ page }) => {
    await page.goto('/')

    const statusButton = page.getByRole('button', { name: /Conversation status:/ })
    await expect(statusButton).toBeVisible()
    await statusButton.click()
    await expect(page.getByRole('button', { name: 'Conversation status: Pending' })).toBeVisible()

    await page.getByRole('button', { name: 'Conversation options' }).click()
    await page.getByRole('textbox', { name: 'Add conversation tag' }).fill('browser-smoke')
    await page.getByRole('button', { name: 'Add conversation tag' }).click()
    await expect(page.getByTitle('Remove browser-smoke')).toBeVisible()
  })

  test('assigns and escalates a conversation from Agent Workspace', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Conversation options' }).click()

    const assignment = page.getByLabel('Assign to')
    await assignment.selectOption({ label: 'Support Team' })
    await expect(assignment).toHaveValue('Support Team')

    await page.getByRole('button', { name: 'Escalate conversation' }).click()
    await expect(page.getByRole('button', { name: 'Remove escalation' })).toBeVisible()

    await page.getByRole('button', { name: /priority \(toggle\)/ }).click()
    await expect(page.getByRole('button', { name: /High priority \(toggle\)/ })).toBeVisible()
  })

  test('creates and deletes an ontology node from Graph Explorer', async ({ page }) => {
    const nodeId = `browser:smoke-${Date.now()}`
    const nodeLabel = `Browser Smoke Node ${Date.now()}`
    await page.goto('/')
    await page.getByRole('button', { name: 'Knowledge base' }).click()
    await page.getByRole('tab', { name: 'Graph Explorer' }).click()
    await page.getByRole('textbox', { name: 'Ontology node id' }).fill(nodeId)
    await page.getByRole('textbox', { name: 'Ontology node label' }).fill(nodeLabel)
    await page.getByRole('button', { name: 'Save node' }).click()

    const graphNode = page.getByRole('button', { name: `Graph node ${nodeLabel}` })
    await expect(graphNode).toBeVisible()
    await graphNode.focus()
    await graphNode.press('Enter')
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Delete node' }).click()
    await page.reload()
    await page.getByRole('button', { name: 'Knowledge base' }).click()
    await page.getByRole('tab', { name: 'Graph Explorer' }).click()
    await expect(graphNode).toHaveCount(0)
  })

  test('creates, edits, and deletes a graph relationship', async ({ page }) => {
    const suffix = Date.now()
    const sourceId = `browser:relationship-source-${suffix}`
    const targetId = `browser:relationship-target-${suffix}`
    const sourceLabel = `Relationship Source ${suffix}`
    const targetLabel = `Relationship Target ${suffix}`
    await page.goto('/')
    await page.getByRole('button', { name: 'Knowledge base' }).click()
    await page.getByRole('tab', { name: 'Graph Explorer' }).click()

    for (const node of [
      { id: sourceId, label: sourceLabel, type: 'Customer' },
      { id: targetId, label: targetLabel, type: 'SupportProcedure' },
    ]) {
      await page.getByRole('textbox', { name: 'Ontology node id' }).fill(node.id)
      await page.getByRole('combobox', { name: 'Ontology node type' }).selectOption(node.type)
      await page.getByRole('textbox', { name: 'Ontology node label' }).fill(node.label)
      await page.getByRole('button', { name: 'Save node' }).click()
      await expect(page.getByRole('button', { name: `Graph node ${node.label}` })).toBeVisible()
    }

    await page.getByRole('combobox', { name: 'Relationship source' }).selectOption(sourceId)
    await page.getByPlaceholder('Relationship, e.g. REPORTS').fill('supports')
    await page.getByRole('combobox', { name: 'Relationship target' }).selectOption(targetId)
    await page.getByRole('button', { name: 'Save link' }).click()
    await expect(page.locator('g.graph-edge').filter({ hasText: 'SUPPORTS' })).toBeVisible()

    const relationshipEdge = page.locator('g.graph-edge').filter({ hasText: 'SUPPORTS' })
    await relationshipEdge.locator('path').dispatchEvent('click')
    await expect(page.getByText('Selected relationship', { exact: true })).toBeVisible()
    await page.locator('.graph-selected-link input').fill('informs')
    await page.getByRole('button', { name: 'Save link changes' }).click()
    await expect(page.locator('g.graph-edge').filter({ hasText: 'INFORMS' })).toBeVisible()

    const updatedEdge = page.locator('g.graph-edge').filter({ hasText: 'INFORMS' })
    await updatedEdge.locator('path').dispatchEvent('click')
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Delete link' }).click()
    await expect(page.locator('g.graph-edge').filter({ hasText: 'INFORMS' })).toHaveCount(0)

    for (const label of [sourceLabel, targetLabel]) {
      const graphNode = page.getByRole('button', { name: `Graph node ${label}` })
      await graphNode.focus()
      await graphNode.press('Enter')
      page.once('dialog', (dialog) => void dialog.accept())
      await page.getByRole('button', { name: 'Delete node' }).click()
      await expect(graphNode).toHaveCount(0)
    }
  })

  test('uploads and deletes a knowledge document', async ({ page }) => {
    const title = `Browser Smoke Upload ${Date.now()}`
    await page.goto('/')
    await page.getByRole('button', { name: 'Knowledge base' }).click()
    await page.getByRole('button', { name: 'Upload document' }).click()
    await page.getByLabel('Knowledge document file').setInputFiles({
      name: 'browser-smoke.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Browser smoke upload content for ARIA knowledge retrieval.'),
    })
    await page.getByRole('textbox', { name: 'Title (optional)' }).fill(title)
    await page.getByRole('button', { name: 'Upload and index' }).click()

    const row = page.locator('tr').filter({ hasText: title })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: `Delete ${title}` }).click()
    await expect(row).toHaveCount(0)
  })

  test('archives and restores a knowledge record', async ({ page }) => {
    const title = `Browser Smoke Archive ${Date.now()}`
    await page.goto('/')
    await page.getByRole('button', { name: 'Knowledge base' }).click()
    await page.getByRole('button', { name: 'Add knowledge' }).click()
    await page.getByRole('textbox', { name: 'Knowledge title' }).fill(title)
    await page.getByRole('textbox', { name: 'Knowledge answering note' }).fill('Temporary archive workflow record.')
    await page.getByRole('button', { name: 'Save knowledge' }).click()

    let row = page.locator('tr').filter({ hasText: title })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: `Archive ${title}` }).click()
    await expect(row).toHaveCount(0)

    await page.getByRole('button', { name: 'Archived documents' }).click()
    row = page.locator('tr').filter({ hasText: title })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: `Restore ${title}` }).click()
    await expect(row).toHaveCount(0)

    await page.getByRole('button', { name: 'Active documents' }).click()
    await expect(page.locator('tr').filter({ hasText: title })).toBeVisible()
    await page.locator('tr').filter({ hasText: title }).getByRole('button', { name: `Delete ${title}` }).click()
    await expect(page.locator('tr').filter({ hasText: title })).toHaveCount(0)
  })

  test('bulk archives and restores knowledge records', async ({ page }) => {
    const firstTitle = `Browser bulk archive A ${Date.now()}`
    const secondTitle = `${firstTitle} B`
    await page.goto('/')
    await page.getByRole('button', { name: 'Knowledge base' }).click()

    for (const title of [firstTitle, secondTitle]) {
      await page.getByRole('button', { name: 'Add knowledge' }).click()
      await page.getByRole('textbox', { name: 'Knowledge title' }).fill(title)
      await page.getByRole('textbox', { name: 'Knowledge answering note' }).fill('Temporary bulk archive browser smoke record.')
      await page.getByRole('button', { name: 'Save knowledge' }).click()
      await expect(page.locator('tr').filter({ hasText: title })).toBeVisible()
    }

    await page.getByRole('checkbox', { name: `Select ${firstTitle}`, exact: true }).check()
    await page.getByRole('checkbox', { name: `Select ${secondTitle}`, exact: true }).check()
    await page.getByRole('button', { name: 'Archive selected' }).click()
    await expect(page.locator('tr').filter({ hasText: firstTitle })).toHaveCount(0)
    await expect(page.locator('tr').filter({ hasText: secondTitle })).toHaveCount(0)

    await page.getByRole('button', { name: 'Archived documents' }).click()
    await expect(page.locator('tr').filter({ has: page.getByRole('checkbox', { name: `Select ${firstTitle}`, exact: true }) })).toBeVisible()
    await expect(page.locator('tr').filter({ has: page.getByRole('checkbox', { name: `Select ${secondTitle}`, exact: true }) })).toBeVisible()
    await page.getByRole('checkbox', { name: `Select ${firstTitle}`, exact: true }).check()
    await page.getByRole('checkbox', { name: `Select ${secondTitle}`, exact: true }).check()
    await page.getByRole('button', { name: 'Restore selected' }).click()
    await expect(page.locator('tr').filter({ hasText: firstTitle })).toHaveCount(0)
    await expect(page.locator('tr').filter({ hasText: secondTitle })).toHaveCount(0)

    await page.getByRole('button', { name: 'Active documents' }).click()
    await expect(page.locator('tr').filter({ has: page.getByRole('checkbox', { name: `Select ${firstTitle}`, exact: true }) })).toBeVisible()
    await expect(page.locator('tr').filter({ has: page.getByRole('checkbox', { name: `Select ${secondTitle}`, exact: true }) })).toBeVisible()
    await page.getByRole('checkbox', { name: `Select ${firstTitle}`, exact: true }).check()
    await page.getByRole('checkbox', { name: `Select ${secondTitle}`, exact: true }).check()
    await page.getByRole('button', { name: 'Delete selected' }).click()
    await expect(page.locator('tr').filter({ hasText: firstTitle })).toHaveCount(0)
    await expect(page.locator('tr').filter({ hasText: secondTitle })).toHaveCount(0)
  })

  test('edits a knowledge record and shows version history', async ({ page }) => {
    const title = `Browser Smoke Version ${Date.now()}`
    const updatedTitle = `${title} Updated`
    await page.goto('/')
    await page.getByRole('button', { name: 'Knowledge base' }).click()
    await page.getByRole('button', { name: 'Add knowledge' }).click()
    await page.getByRole('textbox', { name: 'Knowledge title' }).fill(title)
    await page.getByRole('textbox', { name: 'Knowledge answering note' }).fill('Initial version for browser smoke testing.')
    await page.getByRole('button', { name: 'Save knowledge' }).click()

    let row = page.locator('tr').filter({ hasText: title })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: `Actions for ${title}` }).click()
    await page.getByRole('button', { name: 'Edit document' }).click()
    await page.getByRole('textbox', { name: 'Edit document title' }).fill(updatedTitle)
    await page.getByRole('textbox', { name: 'Edit document content' }).fill('Updated version for browser smoke testing.')
    await page.getByRole('button', { name: 'Save changes' }).click()

    row = page.locator('tr').filter({ hasText: updatedTitle })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: `Actions for ${updatedTitle}` }).click()
    await page.getByRole('button', { name: 'Version history' }).click()
    await expect(page.getByText('Version 1', { exact: true })).toBeVisible()

    await row.getByRole('button', { name: `Delete ${updatedTitle}` }).click()
    await expect(row).toHaveCount(0)
  })

  test('refreshes Analytics for a date range and exports CSV', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Support analytics' }).click()
    const range = page.getByRole('combobox', { name: 'Analytics date range' })
    await range.selectOption('30d')
    await expect(range).toHaveValue('30d')
    await page.getByRole('button', { name: 'Refresh analytics data' }).click()
    await expect(page.getByRole('button', { name: 'Refresh analytics data' })).toBeEnabled()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export analytics CSV' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('aria-analytics-30d.csv')
  })

  test('captures customer feedback for an AI response', async ({ page }) => {
    await page.route('**/api/chat/stream', async (route) => {
      const response = {
        id: 'browser-smoke-message',
        conversationId: 1,
        answer: 'A browser-smoke response for feedback testing.',
        confidence: 0.92,
        sources: ['Refund and return policy'],
        sourceScores: [{ title: 'Refund and return policy', score: 0.92 }],
        retrievalMethod: 'keyword',
        generationProvider: 'local-knowledge',
        latencyMs: 12,
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify({ type: 'chunk', text: response.answer })}\n\ndata: ${JSON.stringify({ type: 'complete', response })}\n\n`,
      })
    })
    await page.route('**/api/feedback', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true }) })
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Customer chat' }).click()
    await page.getByRole('textbox', { name: 'Customer support question' }).fill('How long does a refund take after approval?')
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.locator('.customer-bubble.bot')).toHaveCount(2, { timeout: 30_000 })

    await page.getByRole('button', { name: 'Rate 5 out of 5' }).click()
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByText('Thanks. Your feedback helps ARIA improve.', { exact: true })).toBeVisible()
  })

  test('starts a fresh Customer Chat and downloads its transcript', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Customer chat' }).click()
    const question = page.getByRole('textbox', { name: 'Customer support question' })
    await question.fill('A question that should be cleared.')
    await page.getByRole('button', { name: 'Start new conversation' }).click()
    await expect(question).toHaveValue('')
    await expect(page.getByText('Hello! I am ARIA. How can I help with your order today?', { exact: true })).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download conversation' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('aria-customer-conversation.txt')
  })

  test('copies and retries the latest Customer Chat response', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:5173' })
    await page.route('**/api/chat/stream', async (route) => {
      const response = {
        id: `browser-smoke-message-${Date.now()}`,
        conversationId: 1,
        answer: 'A browser-smoke response for retry testing.',
        confidence: 0.9,
        sources: ['Refund and return policy'],
        sourceScores: [{ title: 'Refund and return policy', score: 0.9 }],
        retrievalMethod: 'keyword',
        generationProvider: 'local-knowledge',
        latencyMs: 10,
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify({ type: 'chunk', text: response.answer })}\n\ndata: ${JSON.stringify({ type: 'complete', response })}\n\n`,
      })
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Customer chat' }).click()
    await page.getByRole('textbox', { name: 'Customer support question' }).fill('How long does a refund take after approval?')
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.locator('.customer-bubble.bot')).toHaveCount(2, { timeout: 30_000 })

    await page.getByRole('button', { name: 'Copy' }).click()
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('A browser-smoke response for retry testing.')

    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.locator('.customer-bubble.bot')).toHaveCount(3, { timeout: 30_000 })
  })

  test('switches the interface language for navigation and Customer Chat', async ({ page }) => {
    await page.goto('/')
    const language = page.getByRole('combobox', { name: 'Language' })
    await language.selectOption('hi')
    await expect(page.getByRole('button', { name: 'ग्राहक चैट' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ज्ञान आधार' })).toBeVisible()

    await page.getByRole('button', { name: 'ग्राहक चैट' }).click()
    const question = page.locator('.customer-composer input')
    await expect(question).toBeAttached()
    await expect(question).toHaveAttribute('placeholder', 'सहायता प्रश्न पूछें...')
    await expect(question).toHaveAttribute('aria-label', 'Customer support question')
    await expect(page.getByText('सत्यापित AI सहायता सहायक', { exact: true })).toBeVisible()
  })

})
