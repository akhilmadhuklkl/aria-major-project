import type { Conversation, KnowledgeItem, QualityTrendData, TopicData, View } from './types'
import { Inbox, MessageCircle, BookOpen, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const conversations: Conversation[] = [
  { id: 1, customer: 'Maya Chen', initials: 'MC', subject: 'Refund status', preview: 'The refund still has not appeared...', time: '2m', priority: 'High', unread: true },
  { id: 2, customer: 'Noah Williams', initials: 'NW', subject: 'Reset password', preview: 'I am locked out of my account.', time: '8m', priority: 'Normal', unread: true },
  { id: 3, customer: 'Priya Sharma', initials: 'PS', subject: 'Change delivery address', preview: 'Can I update the address after...', time: '21m', priority: 'Normal', unread: false },
  { id: 4, customer: 'Daniel Lee', initials: 'DL', subject: 'Damaged item', preview: 'My order arrived with a crack.', time: '38m', priority: 'High', unread: false },
  { id: 5, customer: 'Olivia Martin', initials: 'OM', subject: 'Subscription cancellation', preview: 'Please cancel before renewal.', time: '1h', priority: 'Normal', unread: false },
]

export const knowledgeItems: KnowledgeItem[] = [
  { title: 'Refund and return policy', category: 'Policy', updated: 'Today, 9:40 AM', status: 'Indexed', uses: 128 },
  { title: 'Password reset procedure', category: 'Procedure', updated: 'Yesterday', status: 'Indexed', uses: 94 },
  { title: 'Order delivery FAQ', category: 'FAQ', updated: 'Jun 7, 2026', status: 'Indexed', uses: 76 },
  { title: 'Damaged product resolution', category: 'Procedure', updated: 'Jun 6, 2026', status: 'Indexed', uses: 51 },
  { title: 'Subscription terms', category: 'Policy', updated: 'Jun 3, 2026', status: 'Review', uses: 33 },
]

export const qualityTrend: QualityTrendData[] = [
  { day: 'Jun 3', quality: 71, rating: 3.7 },
  { day: 'Jun 4', quality: 74, rating: 3.8 },
  { day: 'Jun 5', quality: 73, rating: 3.9 },
  { day: 'Jun 6', quality: 78, rating: 4.1 },
  { day: 'Jun 7', quality: 81, rating: 4.2 },
  { day: 'Jun 8', quality: 84, rating: 4.4 },
  { day: 'Jun 9', quality: 87, rating: 4.6 },
]

export const topicData: TopicData[] = [
  { topic: 'Refunds', conversations: 46 },
  { topic: 'Accounts', conversations: 38 },
  { topic: 'Delivery', conversations: 31 },
  { topic: 'Products', conversations: 24 },
  { topic: 'Billing', conversations: 19 },
]

export const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'inbox', label: 'Agent workspace', icon: Inbox },
  { id: 'customer', label: 'Customer chat', icon: MessageCircle },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

