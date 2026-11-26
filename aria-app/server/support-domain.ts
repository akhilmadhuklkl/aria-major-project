export function inferTopic(message: string) {
  const query = message.toLowerCase()
  if (query.includes('refund')) return 'Refunds'
  if (query.includes('password') || query.includes('login')) return 'Accounts'
  if (query.includes('delivery') || query.includes('address') || query.includes('shipping')) return 'Delivery'
  if (query.includes('damaged') || query.includes('product')) return 'Products'
  if (query.includes('subscription') || query.includes('billing')) return 'Billing'
  return 'General'
}

export function calculateQualityScore(rating?: number, feedbackType = 'customer_rating') {
  const ratingScore = rating ? rating * 20 : 60
  const actionAdjustment = feedbackType === 'accepted' ? 15 : feedbackType === 'rejected' ? -20 : 0
  return Math.max(0, Math.min(100, ratingScore + actionAdjustment))
}
