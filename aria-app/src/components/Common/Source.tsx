import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SourceProps {
  icon: LucideIcon
  title: string
  detail: string
}

export function Source({ icon: Icon, title, detail }: SourceProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      className={`source-row ${expanded ? 'expanded' : ''}`}
      aria-label={`View source: ${title}`}
      onClick={() => setExpanded((current) => !current)}
    >
      <Icon size={16} />
      <span>
        <strong>{title}</strong>
        <small>{expanded ? `${detail}. Used as retrieved context for grounded response generation.` : detail}</small>
      </span>
      <ChevronDown size={15} />
    </button>
  )
}
