export function wordCount(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function charCount(text: string): number {
  return text.length
}

export function readTime(text: string): number {
  const wpm = 200
  const wc = wordCount(text)
  if (wc === 0) return 0
  return Math.max(1, Math.round(wc / wpm * 10) / 10)
}
