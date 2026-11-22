export type Language = 'en' | 'hi' | 'es'

const translations = {
  en: { inbox: 'Agent workspace', customer: 'Customer chat', knowledge: 'Knowledge base', analytics: 'Support analytics', help: 'Help', settings: 'Settings', language: 'Language', grounded: 'Grounded', verifiedAssistant: 'Verified AI support assistant', askQuestion: 'Ask a support question...' },
  hi: { inbox: 'एजेंट कार्यक्षेत्र', customer: 'ग्राहक चैट', knowledge: 'ज्ञान आधार', analytics: 'सहायता विश्लेषण', help: 'सहायता', settings: 'सेटिंग्स', language: 'भाषा', grounded: 'सत्यापित', verifiedAssistant: 'सत्यापित AI सहायता सहायक', askQuestion: 'सहायता प्रश्न पूछें...' },
  es: { inbox: 'Espacio del agente', customer: 'Chat del cliente', knowledge: 'Base de conocimiento', analytics: 'Analítica de soporte', help: 'Ayuda', settings: 'Configuración', language: 'Idioma', grounded: 'Verificado', verifiedAssistant: 'Asistente de soporte IA verificado', askQuestion: 'Haz una pregunta de soporte...' },
} as const

export type TranslationKey = keyof typeof translations.en

export function translate(language: Language, key: TranslationKey) {
  return translations[language][key]
}
