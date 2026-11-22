import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

export type SupportedDocumentType = 'pdf' | 'docx' | 'txt' | 'csv'

export function getDocumentType(filename: string, mimeType = ''): SupportedDocumentType | null {
  const extension = filename.toLowerCase().split('.').pop()
  if (extension === 'pdf' || mimeType === 'application/pdf') return 'pdf'
  if (extension === 'docx' || mimeType.includes('wordprocessingml.document')) return 'docx'
  if (extension === 'txt' || mimeType.startsWith('text/plain')) return 'txt'
  if (extension === 'csv' || mimeType.includes('csv')) return 'csv'
  return null
}

export async function extractDocumentText(buffer: Buffer, type: SupportedDocumentType) {
  if (type === 'txt' || type === 'csv') return buffer.toString('utf8').replace(/\r\n/g, '\n').trim()
  if (type === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }

  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text.trim()
  } finally {
    await parser.destroy()
  }
}

