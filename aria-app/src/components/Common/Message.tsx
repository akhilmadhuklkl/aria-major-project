export interface MessageProps {
  from: 'customer' | 'agent'
  time: string
  children: string
}

export function Message({ from, time, children }: MessageProps) {
  return (
    <div className={`message ${from}`}>
      <div className="message-meta"><strong>{from === 'customer' ? 'Maya Chen' : 'You'}</strong><time>{time}</time></div>
      <p>{children}</p>
    </div>
  )
}
