export interface MessageProps {
  from: 'customer' | 'agent'
  time: string
  author?: string
  children: string
}

export function Message({ from, time, author, children }: MessageProps) {
  return (
    <div className={`message ${from}`}>
      <div className="message-meta"><strong>{from === 'customer' ? author ?? 'Customer' : 'You'}</strong><time>{time}</time></div>
      <p>{children}</p>
    </div>
  )
}
