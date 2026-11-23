import { useEffect, useState } from 'react'
import type { AgentThreadMessage, AuditLog, AuthUser, View, Conversation, ConversationQueueCounts, AnalyticsSummary, ChatMessage, GraphNode, GraphRelationship, KnowledgeItem, NewKnowledgeItem, SystemStatus, WebhookSubscription } from './types'
import type { Language } from './i18n'
import { assistantSuggestions, conversations as conversationsData, conversationThreads, knowledgeItems } from './constants'
import { api } from './api'
import { AppModal } from './components/Layout/AppModal'
import { LoginPage } from './components/Auth/LoginPage'
import { Sidebar } from './components/Layout/Sidebar'
import { Topbar } from './components/Layout/Topbar'
import { AgentWorkspace } from './components/AgentWorkspace/AgentWorkspace'
import { CustomerChat } from './components/CustomerChat/CustomerChat'
import { KnowledgeBase } from './components/KnowledgeBase/KnowledgeBase'
import { Analytics } from './components/Analytics/Analytics'
import './App.css'

export default function App() {
  const [view, setView] = useState<View>('inbox')
  const [activeModal, setActiveModal] = useState<'help' | 'settings'>()
  const [selectedConversation, setSelectedConversation] = useState<Conversation>(conversationsData[0])
  const [conversations, setConversations] = useState<Conversation[]>(conversationsData)
  const [conversationHasMore, setConversationHasMore] = useState(false)
  const [conversationLoading, setConversationLoading] = useState(false)
  const [queueCounts, setQueueCounts] = useState<ConversationQueueCounts>({ mine: 0, unassigned: 0, attention: 0 })
  const [suggestions, setSuggestions] = useState<Record<number, string>>(assistantSuggestions)
  const [suggestionStatus, setSuggestionStatus] = useState('Ready for review')
  const [agentThreads, setAgentThreads] = useState<Record<number, AgentThreadMessage[]>>(conversationThreads)
  const [topSearch, setTopSearch] = useState('')
  const [customerMessages, setCustomerMessages] = useState<ChatMessage[]>([
    { from: 'bot', text: 'Hello! I am ARIA. How can I help with your order today?' },
  ])
  const [customerInput, setCustomerInput] = useState('')
  const [customerConversationId, setCustomerConversationId] = useState<number>()
  const [lastAssistantMessageId, setLastAssistantMessageId] = useState<string>()
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [rating, setRating] = useState(0)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [agentActionLoading, setAgentActionLoading] = useState(false)
  const [knowledgeQuery, setKnowledgeQuery] = useState('')
  const [remoteKnowledge, setRemoteKnowledge] = useState<KnowledgeItem[]>(knowledgeItems)
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([])
  const [graphRelationships, setGraphRelationships] = useState<GraphRelationship[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsSummary>()
  const [systemStatus, setSystemStatus] = useState<SystemStatus>()
  const [healthUnavailable, setHealthUnavailable] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([])
  const [authUser, setAuthUser] = useState<AuthUser>()
  const [authRequired, setAuthRequired] = useState(false)
  const [authSetupAvailable, setAuthSetupAvailable] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [language, setLanguage] = useState<Language>(() => (window.localStorage.getItem('aria.language') as Language) || 'en')

  function changeLanguage(next: Language) {
    setLanguage(next)
    window.localStorage.setItem('aria.language', next)
  }

  useEffect(() => {
    void api.getHealth()
      .then((health) => {
        setAuthRequired(health.authRequired)
        setAuthSetupAvailable(health.authSetupAvailable)
        return api.getCurrentUser().catch(() => undefined)
      })
      .then((user) => setAuthUser(user))
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    if (authLoading || (authRequired && !authUser)) return
    void Promise.allSettled([api.getConversationPage(), api.getKnowledge(), api.getAnalytics(), api.getSystemStatus(), api.getKnowledgeGraph()])
      .then(([conversationsResult, knowledgeResult, analyticsResult, statusResult, graphResult]) => {
        if (conversationsResult.status === 'fulfilled' && conversationsResult.value.items.length > 0) {
          setConversations(conversationsResult.value.items)
          setConversationHasMore(conversationsResult.value.hasMore)
          setQueueCounts(conversationsResult.value.queueCounts)
          setSelectedConversation((current) => conversationsResult.value.items.find((item) => item.id === current.id) ?? conversationsResult.value.items[0])
        }
        if (knowledgeResult.status === 'fulfilled') setRemoteKnowledge(knowledgeResult.value)
        if (analyticsResult.status === 'fulfilled') setAnalytics(analyticsResult.value)
        if (statusResult.status === 'fulfilled') {
          setSystemStatus(statusResult.value)
          setHealthUnavailable(false)
        } else {
          setHealthUnavailable(true)
        }
        if (graphResult.status === 'fulfilled') {
          setGraphNodes(graphResult.value.nodes)
          setGraphRelationships(graphResult.value.relationships)
        }
      })
  }, [authLoading, authRequired, authUser])

  async function refreshSystemStatus() {
    try {
      const status = await api.getSystemStatus()
      setSystemStatus(status)
      setHealthUnavailable(false)
    } catch (error) {
      setHealthUnavailable(true)
      throw error
    }
  }

  useEffect(() => {
    if (authLoading || (authRequired && !authUser)) return
    const refreshStatus = () => {
      void api.getSystemStatus()
        .then((status) => { setSystemStatus(status); setHealthUnavailable(false) })
        .catch(() => setHealthUnavailable(true))
    }
    const interval = window.setInterval(refreshStatus, 30_000)
    return () => window.clearInterval(interval)
  }, [authLoading, authRequired, authUser])

  async function loadMoreConversations() {
    if (conversationLoading || !conversationHasMore) return
    setConversationLoading(true)
    try {
      const page = await api.getConversationPage(50, conversations.length)
      setConversations((current) => [...current, ...page.items.filter((item) => !current.some((existing) => existing.id === item.id))])
      setConversationHasMore(page.hasMore)
    } finally {
      setConversationLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading || (authRequired && !authUser)) return
    void api.getConversationMessages(selectedConversation.id)
      .then((messages) => setAgentThreads((current) => ({ ...current, [selectedConversation.id]: messages })))
      .catch(() => {
        // Seeded thread data remains available if the API is temporarily unavailable.
      })
  }, [authLoading, authRequired, authUser, selectedConversation.id])

  async function refreshGraph() {
    const graph = await api.getKnowledgeGraph()
    setGraphNodes(graph.nodes)
    setGraphRelationships(graph.relationships)
  }

  useEffect(() => {
    if (activeModal !== 'settings') return

    const isAdmin = !authUser || authUser.role === 'admin'
    void Promise.allSettled([api.getSystemStatus(), isAdmin ? api.getAuditLogs() : Promise.resolve([]), isAdmin ? api.getWebhooks() : Promise.resolve([])])
      .then(([statusResult, auditResult, webhookResult]) => {
        if (statusResult.status === 'fulfilled') {
          setSystemStatus(statusResult.value)
          setHealthUnavailable(false)
        } else {
          setHealthUnavailable(true)
        }
        if (auditResult.status === 'fulfilled') setAuditLogs(auditResult.value)
        if (webhookResult.status === 'fulfilled') setWebhooks(webhookResult.value)
      })
      .catch(() => {
        // Existing settings values remain visible if the API is temporarily unavailable.
      })
  }, [activeModal, authUser])

  useEffect(() => {
    if (!activeModal) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setActiveModal(undefined)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activeModal])

  useEffect(() => {
    document.querySelector('.main-content')?.scrollTo({ top: 0 })
  }, [view])

  async function sendCustomerMessage(override?: string) {
    const message = (typeof override === 'string' ? override : customerInput).trim()
    if (!message || chatLoading) return
    setCustomerMessages((current) => [...current, { from: 'customer', text: message }])
    if (typeof override !== 'string') setCustomerInput('')
    setFeedbackSent(false)
    setRating(0)
    setChatError('')
    setChatLoading(true)
    const streamingMessageId = `stream-${Date.now()}`
    setCustomerMessages((current) => [...current, { from: 'bot', text: '', id: streamingMessageId }])

    try {
      const result = await api.chatStream(message, customerConversationId, language, (chunk) => {
        setCustomerMessages((current) => current.map((item) => item.id === streamingMessageId ? { ...item, text: `${item.text}${chunk}` } : item))
      })
      setCustomerConversationId(result.conversationId)
      setLastAssistantMessageId(result.id)
      setCustomerMessages((current) => current.map((item) => item.id === streamingMessageId ? {
        ...item,
        text: result.answer,
        id: result.id,
        conversationId: result.conversationId,
        confidence: result.confidence,
        sources: result.sources,
        sourceScores: result.sourceScores,
        retrievalMethod: result.retrievalMethod,
        generationProvider: result.generationProvider,
        latencyMs: result.latencyMs,
      } : item))
    } catch (error) {
      setCustomerMessages((current) => current.filter((item) => item.id !== streamingMessageId))
      setChatError(error instanceof Error ? error.message : 'ARIA could not send a response.')
    } finally {
      setChatLoading(false)
    }
  }

  function startNewCustomerConversation() {
    setCustomerMessages([{ from: 'bot', text: 'Hello! I am ARIA. How can I help with your order today?' }])
    setCustomerConversationId(undefined)
    setLastAssistantMessageId(undefined)
    setRating(0)
    setFeedbackSent(false)
    setChatError('')
  }

  function retryCustomerMessage() {
    const lastQuestion = [...customerMessages].reverse().find((message) => message.from === 'customer')
    if (lastQuestion) void sendCustomerMessage(lastQuestion.text)
  }

  function downloadCustomerTranscript() {
    const transcript = customerMessages.map((message) => `${message.from === 'bot' ? 'ARIA' : 'Customer'}: ${message.text}`).join('\n\n')
    const url = URL.createObjectURL(new Blob([transcript], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'aria-customer-conversation.txt'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function submitCustomerFeedback() {
    if (!rating || !lastAssistantMessageId || !customerConversationId || feedbackLoading) return
    setFeedbackLoading(true)
    setChatError('')
    try {
      await api.submitFeedback({
        rating,
        messageId: lastAssistantMessageId,
        conversationId: customerConversationId,
      })
      setFeedbackSent(true)
      setAnalytics(await api.getAnalytics())
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Feedback could not be saved.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  function regenerateSuggestion() {
    const updated = `${assistantSuggestions[selectedConversation.id]} I have refreshed this suggestion using the current conversation context.`
    setSuggestions((current) => ({ ...current, [selectedConversation.id]: updated }))
    setSuggestionStatus('Regenerated just now')
  }

  function addAgentMessage(message: string, type: 'agent' | 'note' = 'agent') {
    const text = message.trim()
    if (!text) return
    const actionText = type === 'note'
      ? `Internal note saved for ${selectedConversation.customer}.`
      : `Agent reply sent to ${selectedConversation.customer} and stored in this conversation.`
    setAgentThreads((current) => ({
      ...current,
      [selectedConversation.id]: [
        ...(current[selectedConversation.id] ?? []),
        {
          from: type,
          text: type === 'note' ? `Internal note: ${text}` : text,
          time: 'Now',
        },
        {
          from: 'system',
          text: actionText,
          time: 'Now',
        },
      ],
    }))
  }

  function selectAgentConversation(conversation: Conversation) {
    setSelectedConversation(conversation)
    setSuggestionStatus('Ready for review')
  }

  async function updateConversation(id: number, changes: Partial<Pick<Conversation, 'status' | 'priority' | 'assignedTo' | 'tags' | 'escalated'>>) {
    await api.updateConversation(id, changes)
    setSelectedConversation((current) => current.id === id ? { ...current, ...changes } : current)
  }

  async function exportSelectedConversation() {
    const blob = await api.exportConversation(selectedConversation.id)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `aria-conversation-${selectedConversation.id}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function submitAgentAction(action: 'accepted' | 'edited' | 'rejected') {
    if (agentActionLoading) return
    const statusByAction = {
      accepted: 'Accepted and recorded as positive feedback',
      edited: 'Saved as an agent correction',
      rejected: 'Rejected - negative feedback recorded',
    }
    setAgentActionLoading(true)
    setSuggestionStatus('Saving agent action...')
    try {
      if (action === 'accepted' || action === 'edited') {
        addAgentMessage(suggestions[selectedConversation.id] ?? '')
      }
      await api.submitAgentAction({
        conversationId: selectedConversation.id,
        action,
        editedResponse: action === 'edited' ? suggestions[selectedConversation.id] : undefined,
      })
      setAnalytics(await api.getAnalytics())
      setSuggestionStatus(statusByAction[action])
    } catch (error) {
      setSuggestionStatus(error instanceof Error ? error.message : 'Agent action could not be saved.')
    } finally {
      setAgentActionLoading(false)
    }
  }

  async function addKnowledge(input: NewKnowledgeItem) {
    const created = await api.addKnowledge(input)
    setRemoteKnowledge((current) => [created, ...current])
    void api.getSystemStatus().then(setSystemStatus).catch(() => undefined)
  }

  async function deleteKnowledge(ids: number[]) {
    await api.deleteKnowledge(ids)
    setRemoteKnowledge((current) => current.filter((item) => !item.id || !ids.includes(item.id)))
    void Promise.allSettled([api.getAnalytics(), api.getSystemStatus()])
      .then(([analyticsResult, statusResult]) => {
        if (analyticsResult.status === 'fulfilled') setAnalytics(analyticsResult.value)
        if (statusResult.status === 'fulfilled') setSystemStatus(statusResult.value)
      })
  }

  async function uploadKnowledge(file: File, category: string, title?: string) {
    const uploaded = await api.uploadKnowledge(file, category, title)
    setRemoteKnowledge((current) => [uploaded, ...current])
    void api.getSystemStatus().then(setSystemStatus).catch(() => undefined)
  }

  async function archiveKnowledge(ids: number[]) {
    await api.archiveKnowledge(ids)
    setRemoteKnowledge((current) => current.filter((item) => !item.id || !ids.includes(item.id)))
  }

  async function refreshAnalytics(range = '7d') {
    setAnalytics(await api.getAnalytics(range))
  }

  async function login(email: string, password: string) {
    const user = await api.login(email, password)
    setAuthUser(user)
    setShowLogin(false)
    return user
  }

  async function bootstrap(input: { email: string; displayName: string; password: string }) {
    const user = await api.bootstrap(input)
    setAuthUser(user)
    setAuthSetupAvailable(false)
    setShowLogin(false)
    return user
  }

  async function logout() {
    await api.logout()
    setAuthUser(undefined)
    setShowLogin(authRequired)
  }

  async function createWebhook(input: { name: string; url: string; events: string[] }) {
    const created = await api.createWebhook(input)
    setWebhooks((current) => [{ ...created }, ...current])
    return created.secret
  }

  async function deleteWebhook(id: number) {
    await api.deleteWebhook(id)
    setWebhooks((current) => current.filter((webhook) => webhook.id !== id))
  }

  if (authLoading) {
    return <main className="auth-loading"><div className="brand-mark"><span>✦</span></div><strong>Loading ARIA...</strong></main>
  }

  if (authRequired && !authUser) {
    return <LoginPage onLogin={login} onBootstrap={bootstrap} setupAvailable={authSetupAvailable} />
  }

  if (showLogin) {
    return <LoginPage onLogin={login} onBootstrap={bootstrap} setupAvailable={authSetupAvailable} />
  }

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        onChange={setView}
        onHelp={() => setActiveModal('help')}
        onSettings={() => setActiveModal('settings')}
        user={authUser}
        onLogin={() => setShowLogin(true)}
        onLogout={() => void logout()}
        language={language}
        onLanguageChange={changeLanguage}
      />
      <div className="app-body">
        <Topbar
          key={view}
          view={view}
          searchQuery={view === 'knowledge' ? knowledgeQuery : topSearch}
          onSearch={view === 'knowledge' ? setKnowledgeQuery : setTopSearch}
          searchEnabled={view === 'inbox' || view === 'knowledge'}
          searchPlaceholder={view === 'knowledge' ? 'Search knowledge' : 'Search conversations'}
          language={language}
          systemStatus={systemStatus}
          healthUnavailable={healthUnavailable}
          onRefreshStatus={refreshSystemStatus}
        />
        <main className="main-content">
          {view === 'inbox' && (
            <AgentWorkspace
              selected={selectedConversation}
              conversations={conversations}
              onSelect={selectAgentConversation}
              messages={agentThreads[selectedConversation.id] ?? []}
              onSendMessage={addAgentMessage}
              searchQuery={topSearch}
              suggestion={suggestions[selectedConversation.id] ?? ''}
              setSuggestion={(value) => setSuggestions((current) => ({ ...current, [selectedConversation.id]: value }))}
              status={suggestionStatus}
              onAction={submitAgentAction}
              regenerate={regenerateSuggestion}
              actionLoading={agentActionLoading}
              onUpdateConversation={updateConversation}
              onExport={exportSelectedConversation}
              onLoadMore={loadMoreConversations}
              conversationHasMore={conversationHasMore}
              conversationLoading={conversationLoading}
              queueCounts={queueCounts}
            />
          )}
          {view === 'customer' && (
            <CustomerChat
              messages={customerMessages}
              input={customerInput}
              setInput={setCustomerInput}
              send={sendCustomerMessage}
              rating={rating}
              setRating={setRating}
              feedbackSent={feedbackSent}
              submitFeedback={submitCustomerFeedback}
              feedbackLoading={feedbackLoading}
              loading={chatLoading}
              error={chatError}
              onRetry={retryCustomerMessage}
              onNewConversation={startNewCustomerConversation}
              onDownload={downloadCustomerTranscript}
              mode="Persistent API"
              sourceCount={remoteKnowledge.filter((item) => item.status === 'Indexed').length}
              language={language}
            />
          )}
          {view === 'knowledge' && (
            <KnowledgeBase
              query={knowledgeQuery}
              setQuery={setKnowledgeQuery}
              items={remoteKnowledge}
              onAdd={addKnowledge}
              onUpload={uploadKnowledge}
              onDelete={deleteKnowledge}
              onArchive={archiveKnowledge}
              onRefreshGraph={refreshGraph}
              graphNodes={graphNodes}
              graphRelationships={graphRelationships}
            />
          )}
          {view === 'analytics' && <Analytics summary={analytics} onRefresh={refreshAnalytics} />}
        </main>
      </div>
      {activeModal && (
        <AppModal
          type={activeModal}
          knowledgeItems={remoteKnowledge}
          analytics={analytics}
          systemStatus={systemStatus}
          auditLogs={auditLogs}
          webhooks={webhooks}
          isAdmin={!authUser || authUser.role === 'admin'}
          onCreateWebhook={createWebhook}
          onDeleteWebhook={deleteWebhook}
          onClose={() => setActiveModal(undefined)}
        />
      )}
    </div>
  )
}
