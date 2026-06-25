import { useEffect, useState } from 'react'
import type { View, Conversation, AnalyticsSummary, KnowledgeItem, NewKnowledgeItem } from './types'
import { conversations as conversationsData, knowledgeItems } from './constants'
import { api } from './api'
import { Sidebar } from './components/Layout/Sidebar'
import { Topbar } from './components/Layout/Topbar'
import { AgentWorkspace } from './components/AgentWorkspace/AgentWorkspace'
import { CustomerChat } from './components/CustomerChat/CustomerChat'
import { KnowledgeBase } from './components/KnowledgeBase/KnowledgeBase'
import { Analytics } from './components/Analytics/Analytics'
import './App.css'

export default function App() {
  const [view, setView] = useState<View>('inbox')
  const [selectedConversation, setSelectedConversation] = useState<Conversation>(conversationsData[0])
  const [suggestion, setSuggestion] = useState(
    'Hi Maya, I checked your refund request and it was approved on June 6. Most banks post refunds within 5-7 business days, so it should appear by June 15. If it is not visible after that date, reply here and we will trace it with the payment provider.',
  )
  const [suggestionStatus, setSuggestionStatus] = useState('Ready for review')
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

  useEffect(() => {
    void Promise.all([api.getKnowledge(), api.getAnalytics()])
      .then(([knowledge, summary]) => {
        setRemoteKnowledge(knowledge)
        setAnalytics(summary)
      })
      .catch(() => {
        // Keep the seeded prototype usable when the API is offline.
      })
  }, [])

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
    setSuggestion(
      'Hi Maya, your refund was successfully approved on June 6. Please allow 5-7 business days for your bank to process it. If it has not reached your account by June 15, let us know and our payments team will investigate immediately.',
    )
    setSuggestionStatus('Regenerated just now')
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
      await api.submitAgentAction({
        conversationId: selectedConversation.id,
        action,
        editedResponse: action === 'edited' ? suggestion : undefined,
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
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} onChange={setView} />
      <div className="app-body">
        <Topbar view={view} />
        <main className="main-content">
          {view === 'inbox' && (
            <AgentWorkspace
              selected={selectedConversation}
              onSelect={setSelectedConversation}
              suggestion={suggestion}
              setSuggestion={setSuggestion}
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
            <KnowledgeBase query={knowledgeQuery} setQuery={setKnowledgeQuery} items={remoteKnowledge} onAdd={addKnowledge} />
          )}
          {view === 'analytics' && <Analytics summary={analytics} />}
        </main>
      </div>
    </div>
  )
}
