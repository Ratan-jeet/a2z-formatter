export const ENCODE_MODES = [
  {
    id: 'base64',
    label: 'Base64',
    technique: 'Base64 (RFC 4648)',
    detail: 'Encodes binary/text as A–Z, a–z, 0–9, +, / with = padding. Uses UTF-8 bytes first.',
  },
  {
    id: 'url',
    label: 'URL',
    technique: 'Percent-encoding (URL / URI encoding)',
    detail: 'Unsafe characters become %HH (e.g. space → %20). Uses encodeURIComponent / decodeURIComponent.',
  },
  {
    id: 'html',
    label: 'HTML entities',
    technique: 'HTML character references',
    detail: 'Escapes &, <, >, ", and \' as &amp; &lt; &gt; &quot; &#39; so text is safe in HTML.',
  },
  {
    id: 'jwt',
    label: 'JWT',
    technique: 'Base64URL (JWT parts)',
    detail: 'Decodes header & payload from Base64URL JSON segments. Signature is shown but not verified.',
  },
]

export const ENCODE_SAMPLES = {
  base64: 'Hello A2Z Formatter',
  url: 'https://a2z-formatter.vercel.app/?q=json formatter&lang=en',
  html: `<p class="lead">A2Z & "quotes" — <b>safe</b></p>`,
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkEyWiBGb3JtYXR0ZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.signature-demo',
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function base64ToUtf8(text) {
  const cleaned = text.trim().replace(/\s+/g, '')
  const binary = atob(cleaned)
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeHtml(text) {
  const el = document.createElement('textarea')
  el.innerHTML = text
  return el.value
}

function decodeJwt(token) {
  const raw = token.trim()
  const parts = raw.split('.')
  if (parts.length < 2) throw new Error('JWT must have at least header.payload')

  const decodePart = (part, label) => {
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    try {
      const json = base64ToUtf8(padded)
      return JSON.parse(json)
    } catch {
      throw new Error(`Invalid JWT ${label}`)
    }
  }

  const header = decodePart(parts[0], 'header')
  const payload = decodePart(parts[1], 'payload')
  return {
    header,
    payload,
    signature: parts[2] || null,
    note: 'Signature is not verified — decode only.',
  }
}

export function encodeText(raw, mode) {
  const text = raw
  if (!String(text).length) throw new Error('Input is empty')

  if (mode === 'base64') return utf8ToBase64(text)
  if (mode === 'url') return encodeURIComponent(text)
  if (mode === 'html') return encodeHtml(text)
  if (mode === 'jwt') throw new Error('JWT mode is decode-only')
  throw new Error('Unknown mode')
}

export function decodeText(raw, mode) {
  const text = String(raw)
  if (!text.trim()) throw new Error('Input is empty')

  if (mode === 'base64') return base64ToUtf8(text)
  if (mode === 'url') return decodeURIComponent(text.replace(/\+/g, ' '))
  if (mode === 'html') return decodeHtml(text)
  if (mode === 'jwt') {
    return JSON.stringify(decodeJwt(text), null, 2)
  }
  throw new Error('Unknown mode')
}

export function modeSupportsEncode(mode) {
  return mode !== 'jwt'
}
