import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({
  gfm: true,
  breaks: true,
})

export const MARKDOWN_SAMPLE = `# A2Z Markdown

Write **Markdown** on the left and preview it on the right.

## Features
- Live preview
- GitHub-flavored markdown
- Safe HTML output

\`\`\`js
console.log("Hello A2Z");
\`\`\`

> Tip: Use Sample to load this text.
`

export function renderMarkdown(raw) {
  const html = marked.parse(raw || '')
  return DOMPurify.sanitize(String(html))
}
