import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({
  breaks: true,
  gfm: true,
})

export function renderMarkdown(source: string): string {
  if (!source) return ''
  const raw = marked.parse(source) as string
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target'],
  })
}
