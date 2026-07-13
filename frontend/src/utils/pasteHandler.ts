import DOMPurify from 'dompurify'

export function htmlToMarkdown(html: string): string {
  let md = DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b', 'i', 'a', 'br', 'li', 'ul', 'ol', 'p'] })
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**')
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*')
  md = md.replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
  md = md.replace(/<br\s*\/?>/gi, '\n')
  md = md.replace(/<\/li>/gi, '\n')
  md = md.replace(/<li[^>]*>/gi, '- ')
  md = md.replace(/<ul[^>]*>/gi, '')
  md = md.replace(/<\/ul>/gi, '\n')
  md = md.replace(/<ol[^>]*>/gi, '')
  md = md.replace(/<\/ol>/gi, '\n')
  md = md.replace(/<p[^>]*>/gi, '\n')
  md = md.replace(/<\/p>/gi, '\n')
  return md.trim()
}
