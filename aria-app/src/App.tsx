import { useEffect, useState } from 'react'
import type { AgentThreadMessage, View, Conversation, AnalyticsSummary, KnowledgeItem, NewKnowledgeItem, SystemStatus } from './types'
import { assistantSuggestions, conversations as conversationsData, conversationThreads, knowledgeItems } from './constants'
import { api } from './api'
import { AppModal } from './components/Layout/AppModal'
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
  const [suggestions, setSuggestions] = useState<Record<number, string>>(assistantSuggestions)
  const [suggestionStatus, setSuggestionStatus] = useState('Ready for review')
  const [agentThreads, setAgentThreads] = useState<Record<number, AgentThreadMessage[]>>(conversationThreads)
  const [topSearch, setTopSearch] = useState('')
  const [customerMessages, setCustomerMessages] = useState([
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
  const [analytics, setAnalytics] = useState<AnalyticsSummary>()
  const [systemStatus, setSystemStatus] = useState<SystemStatus>()

  useEffect(() => {
    void Promise.allSettled([api.getKnowledge(), api.getAnalytics(), api.getSystemStatus()])
      .then(([knowledgeResult, analyticsResult, statusResult]) => {
        if (knowledgeResult.status === 'fulfilled') setRemoteKnowledge(knowledgeResult.value)
        if (analyticsResult.status === 'fulfilled') setAnalytics(analyticsResult.value)
        if (statusResult.status === 'fulfilled') setSystemStatus(statusResult.value)
      })
  }, [])

  useEffect(() => {
    if (activeModal !== 'settings') return

    void api.getSystemStatus()
      .then(setSystemStatus)
      .catch(() => {
        // Existing settings values remain visible if the API is temporarily unavailable.
      })
  }, [activeModal])

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

  async function sendCustomerMessage() {
    const message = customerInput.trim()
    if (!message || chatLoading) return
    setCustomerMessages((current) => [...current, { from: 'customer', text: message }])
    setCustomerInput('')
    setFeedbackSent(false)
    setRating(0)
    setChatError('')
    setChatLoading(true)

    try {
      const result = await api.chat(message, customerConversationId)
      setCustomerConversationId(result.conversationId)
      setLastAssistantMessageId(result.id)
      setCustomerMessages((current) => [
        ...current,
        {
          from: 'bot',
          text: result.answer,
          id: result.id,
          conversationId: result.conversationId,
          confidence: result.confidence,
          sources: result.sources,
          sourceScores: result.sourceScores,
          retrievalMethod: result.retrievalMethod,
          generationProvider: result.generationProvider,
        },
      ])
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'ARIA could not send a response.')
    } finally {
      setChatLoading(false)
    }
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

  async function refreshAnalytics() {
    setAnalytics(await api.getAnalytics())
  }

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        onChange={setView}
        onHelp={() => setActiveModal('help')}
        onSettings={() => setActiveModal('settings')}
      />
      <div className="app-body">
        <Topbar
          key={view}
          view={view}
          searchQuery={view === 'knowledge' ? knowledgeQuery : topSearch}
          onSearch={view === 'knowledge' ? setKnowledgeQuery : setTopSearch}
          searchEnabled={view === 'inbox' || view === 'knowledge'}
          searchPlaceholder={view === 'knowledge' ? 'Search knowledge' : 'Search conversations'}
        />
        <main className="main-content">
          {view === 'inbox' && (
            <AgentWorkspace
              selected={selectedConversation}
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
              mode="Persistent API"
              sourceCount={remoteKnowledge.filter((item) => item.status === 'Indexed').length}
            />
          )}
          {view === 'knowledge' && (
            <KnowledgeBase query={knowledgeQuery} setQuery={setKnowledgeQuery} items={remoteKnowledge} onAdd={addKnowledge} onDelete={deleteKnowledge} />
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
          onClose={() => setActiveModal(undefined)}
        />
      )}
    </div>
  )
}
