import { Check, Star } from 'lucide-react'
import type { ChatMessage } from '../../types'

export interface FeedbackPromptProps {
  messages: ChatMessage[]
  rating: number
  setRating: (value: number) => void
  feedbackSent: boolean
  submitFeedback: () => void
}

export function FeedbackPrompt({ messages, rating, setRating, feedbackSent, submitFeedback }: FeedbackPromptProps) {
  if (messages.length <= 1) return null

  return (
    <div className="feedback-prompt">
      {feedbackSent ? (
        <span><Check size={16} /> Thanks. Your feedback helps ARIA improve.</span>
      ) : (
        <>
          <div><strong>Was this response helpful?</strong><span>Rate the last ARIA response.</span></div>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setRating(star)} className={rating >= star ? 'active' : ''}><Star size={18} /></button>)}
          </div>
          <button className="secondary-button" disabled={!rating} onClick={submitFeedback}>Submit</button>
        </>
      )}
    </div>
  )
}
