export const normalizeReplyContentHtml = (content?: string) => {
  const rawContent = content?.trim() || ''
  if (!rawContent) return ''

  const escapedNormalized = rawContent
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, '  ')

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = escapedNormalized
    return textarea.value
  }

  return escapedNormalized
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

export const getReplyContentPreviewText = (content?: string) => {
  const html = normalizeReplyContentHtml(content)
  if (!html) return ''

  if (typeof document !== 'undefined') {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent?.replace(/\s+/g, ' ').trim() || ''
  }

  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
