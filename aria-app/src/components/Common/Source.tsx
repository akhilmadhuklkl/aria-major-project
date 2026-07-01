import { ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SourceProps {
  icon: LucideIcon
  title: string
  detail: string
}

export function Source({ icon: Icon, title, detail }: SourceProps) {
  return <button className="source-row" aria-label={`View source: ${title}`}><Icon size={16} /><span><strong>{title}</strong><small>{detail}</small></span><ChevronDown size={15} /></button>
}
