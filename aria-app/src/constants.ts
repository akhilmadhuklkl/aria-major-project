import type { AgentThreadMessage, Conversation, KnowledgeItem, QualityTrendData, TopicData, View } from './types'
import { Inbox, MessageCircle, BookOpen, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const conversations: Conversation[] = [
  { id: 1, customer: 'Maya Chen', initials: 'MC', subject: 'Refund status', orderNumber: 'AR-20491', preview: 'The refund still has not appeared...', time: '2m', priority: 'High', unread: true },
  { id: 2, customer: 'Noah Williams', initials: 'NW', subject: 'Reset password', orderNumber: 'AR-20518', preview: 'I am locked out of my account.', time: '8m', priority: 'Normal', unread: true },
  { id: 3, customer: 'Priya Sharma', initials: 'PS', subject: 'Change delivery address', orderNumber: 'AR-20536', preview: 'Can I update the address after...', time: '21m', priority: 'Normal', unread: false },
  { id: 4, customer: 'Daniel Lee', initials: 'DL', subject: 'Damaged item', orderNumber: 'AR-20544', preview: 'My order arrived with a crack.', time: '38m', priority: 'High', unread: false },
  { id: 5, customer: 'Olivia Martin', initials: 'OM', subject: 'Subscription cancellation', orderNumber: 'AR-20559', preview: 'Please cancel before renewal.', time: '1h', priority: 'Normal', unread: false },
]

export const conversationThreads: Record<number, AgentThreadMessage[]> = {
  1: [
    { from: 'customer', time: '10:12 AM', text: 'Hi, I received an email saying my refund was approved, but it still has not appeared in my account. Can you check what is happening?' },
    { from: 'system', time: '10:13 AM', text: 'ARIA reviewed 3 knowledge sources and prepared a response.' },
    { from: 'agent', time: '10:14 AM', text: 'Thanks for reaching out, Maya. I am checking the refund status and expected processing time for you now.' },
    { from: 'customer', time: '10:15 AM', text: 'Thank you. I need to know when I should expect it.' },
  ],
  2: [
    { from: 'customer', time: '10:20 AM', text: 'I am locked out of my account and the password reset email is not arriving.' },
    { from: 'system', time: '10:21 AM', text: 'ARIA matched the password reset procedure and account recovery policy.' },
    { from: 'agent', time: '10:22 AM', text: 'I will help you regain access. Please confirm whether you can still access the email linked to your account.' },
  ],
  3: [
    { from: 'customer', time: '10:31 AM', text: 'Can I change the delivery address after placing my order?' },
    { from: 'system', time: '10:32 AM', text: 'ARIA found the order delivery FAQ and checked dispatch timing conditions.' },
    { from: 'agent', time: '10:33 AM', text: 'Address changes are possible before dispatch. Please share your order number and the updated delivery address.' },
  ],
  4: [
    { from: 'customer', time: '10:44 AM', text: 'My order arrived with a crack on the product. What should I do now?' },
    { from: 'system', time: '10:45 AM', text: 'ARIA selected damaged product resolution as the strongest knowledge source.' },
    { from: 'agent', time: '10:46 AM', text: 'I am sorry about the damaged item. Please share photos of the damage, packaging condition, and your order number.' },
  ],
  5: [
    { from: 'customer', time: '11:02 AM', text: 'Please cancel my subscription before the next renewal.' },
    { from: 'system', time: '11:03 AM', text: 'ARIA retrieved subscription terms and renewal policy details.' },
    { from: 'agent', time: '11:04 AM', text: 'I can help with cancellation. Please confirm the account email and renewal date so I can verify eligibility.' },
  ],
}

export const assistantSuggestions: Record<number, string> = {
  1: 'Hi Maya, I checked your refund request and it was approved on June 6. Most banks post refunds within 5-7 business days, so it should appear by June 15. If it is not visible after that date, reply here and we will trace it with the payment provider.',
  2: 'Hi Noah, please check your spam folder and confirm whether you still have access to the registered email address. If the reset email is still missing, I will verify ownership and escalate the case to account recovery.',
  3: 'Hi Priya, delivery address changes are possible before the order enters dispatch. Please share your order number and the updated address, and I will check whether the order is still editable.',
  4: 'Hi Daniel, I am sorry the item arrived damaged. Please upload photos of the damaged product, packaging condition, and your order number so we can validate the claim and arrange a replacement.',
  5: 'Hi Olivia, I can help cancel the subscription before renewal. Please confirm your account email and renewal date, and I will verify the cancellation status and refund eligibility if renewal already occurred.',
}

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

