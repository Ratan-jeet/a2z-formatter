export const REGEX_SAMPLE_TEXT = `Contact us at support@a2z-formatter.app or hello@example.com
Visit https://a2z-formatter.vercel.app today.
Phone: +1-555-0100`

export const REGEX_SAMPLE_PATTERN = `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}`

export function runRegex(pattern, flags, text) {
  if (!pattern) throw new Error('Pattern is empty')

  let regex
  try {
    regex = new RegExp(pattern, flags)
  } catch (err) {
    throw new Error(err.message || 'Invalid regular expression')
  }

  const matches = []
  if (flags.includes('g')) {
    let match
    const clone = new RegExp(pattern, flags)
    while ((match = clone.exec(text)) !== null) {
      matches.push({
        index: match.index,
        value: match[0],
        groups: match.slice(1),
        named: match.groups || null,
      })
      if (match[0].length === 0) clone.lastIndex += 1
    }
  } else {
    const match = regex.exec(text)
    if (match) {
      matches.push({
        index: match.index,
        value: match[0],
        groups: match.slice(1),
        named: match.groups || null,
      })
    }
  }

  return { regex: regex.toString(), matches }
}

export function buildHighlightedHtml(text, matches) {
  if (!matches.length) {
    return escapeHtml(text)
  }

  const sorted = [...matches].sort((a, b) => a.index - b.index)
  let html = ''
  let cursor = 0

  for (const match of sorted) {
    if (match.index < cursor) continue
    html += escapeHtml(text.slice(cursor, match.index))
    html += `<mark class="regex-hit">${escapeHtml(match.value)}</mark>`
    cursor = match.index + match.value.length
  }
  html += escapeHtml(text.slice(cursor))
  return html
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
