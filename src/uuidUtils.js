function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytesToHex(bytes)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function encodeTime(time, len) {
  let str = ''
  for (let i = len - 1; i >= 0; i -= 1) {
    const mod = time % 32
    str = CROCKFORD[mod] + str
    time = Math.floor(time / 32)
  }
  return str
}

function encodeRandom(len) {
  let str = ''
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < len; i += 1) {
    str += CROCKFORD[bytes[i] % 32]
  }
  return str
}

/** Monotonic-friendly ULID (Crockford Base32). */
export function generateUlid(now = Date.now()) {
  return encodeTime(now, 10) + encodeRandom(16)
}

export function generateMany(kind, count = 5) {
  const n = Math.min(50, Math.max(1, Number(count) || 1))
  const out = []
  for (let i = 0; i < n; i += 1) {
    out.push(kind === 'ulid' ? generateUlid() : generateUuidV4())
  }
  return out
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim(),
  )
}

export function isUlid(value) {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/i.test(String(value || '').trim())
}
