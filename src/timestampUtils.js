export const TIMEZONES = [
  { id: 'Asia/Kolkata', label: 'IST — India (UTC+5:30)' },
  { id: 'UTC', label: 'UTC — Coordinated Universal Time' },
  { id: 'Asia/Dubai', label: 'GST — Dubai (UTC+4)' },
  { id: 'Asia/Singapore', label: 'SGT — Singapore (UTC+8)' },
  { id: 'Asia/Tokyo', label: 'JST — Tokyo (UTC+9)' },
  { id: 'Asia/Shanghai', label: 'CST — China (UTC+8)' },
  { id: 'Europe/London', label: 'London (GMT/BST)' },
  { id: 'Europe/Paris', label: 'Central Europe (CET/CEST)' },
  { id: 'America/New_York', label: 'US Eastern (ET)' },
  { id: 'America/Chicago', label: 'US Central (CT)' },
  { id: 'America/Denver', label: 'US Mountain (MT)' },
  { id: 'America/Los_Angeles', label: 'US Pacific (PT)' },
  { id: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
]

export const DEFAULT_TIMEZONE = 'Asia/Kolkata'

export function nowUnix(unit = 'seconds') {
  const ms = Date.now()
  return unit === 'milliseconds' ? ms : Math.floor(ms / 1000)
}

export function formatInZone(date, timeZone = DEFAULT_TIMEZONE) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')

  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(d)

  const isoLocal = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(d)
    .replace(', ', 'T')

  return {
    display: formatted,
    isoLike: isoLocal,
    isoUtc: d.toISOString(),
    utc: d.toUTCString(),
    timeZone,
  }
}

export function nowInZone(timeZone = DEFAULT_TIMEZONE) {
  return formatInZone(new Date(), timeZone)
}

export function nowIso() {
  return new Date().toISOString()
}

function toMs(raw, unit = 'auto') {
  const text = String(raw ?? '').trim()
  if (!text) throw new Error('Enter a Unix timestamp')
  if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error('Timestamp must be a number')

  const value = Number(text)
  if (!Number.isFinite(value)) throw new Error('Invalid timestamp number')

  if (unit === 'seconds') return value * 1000
  if (unit === 'milliseconds') return value
  const abs = Math.abs(value)
  return abs < 1e12 ? value * 1000 : value
}

export function unixToDate(raw, unit = 'auto', timeZone = DEFAULT_TIMEZONE) {
  const ms = toMs(raw, unit)
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) throw new Error('Timestamp out of range')

  const zoned = formatInZone(date, timeZone)
  return {
    ...zoned,
    unixSeconds: Math.floor(date.getTime() / 1000),
    unixMs: date.getTime(),
  }
}

export function dateToUnix(raw, unit = 'seconds', timeZone = DEFAULT_TIMEZONE) {
  const text = String(raw ?? '').trim()
  if (!text) throw new Error('Enter a date/time string')

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return unixToDate(text, 'auto', timeZone)
  }

  // If user enters bare local-like datetime without Z/offset, treat as selected zone wall time.
  const bare = text.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/,
  )

  let date
  if (bare) {
    const [, y, mo, d, h, mi, s = '0', frac = '0'] = bare
    const asUtc = Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
      Number(frac.padEnd(3, '0')),
    )
    // Convert "wall time in zone" → real UTC instant via offset probe
    const probe = new Date(asUtc)
    const shown = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(probe)
    const get = (type) => Number(shown.find((p) => p.type === type)?.value || 0)
    const asShownUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
    const offset = asShownUtc - asUtc
    date = new Date(asUtc - offset)
  } else {
    date = new Date(text)
  }

  if (Number.isNaN(date.getTime())) throw new Error('Could not parse date/time')

  const zoned = formatInZone(date, timeZone)
  const ms = date.getTime()
  return {
    ...zoned,
    unixSeconds: Math.floor(ms / 1000),
    unixMs: ms,
    primary: unit === 'milliseconds' ? String(ms) : String(Math.floor(ms / 1000)),
  }
}

function parseInstant(raw, timeZone = DEFAULT_TIMEZONE) {
  const text = String(raw ?? '').trim()
  if (!text) throw new Error('Enter a date or unix timestamp')
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return new Date(toMs(text, 'auto'))
  }
  const parsed = dateToUnix(text, 'seconds', timeZone)
  return new Date(parsed.unixMs)
}

export function formatDuration(ms) {
  const sign = ms < 0 ? '-' : ''
  let rem = Math.abs(Math.floor(ms))
  const days = Math.floor(rem / 86400000)
  rem %= 86400000
  const hours = Math.floor(rem / 3600000)
  rem %= 3600000
  const minutes = Math.floor(rem / 60000)
  rem %= 60000
  const seconds = Math.floor(rem / 1000)
  const millis = rem % 1000

  const parts = []
  if (days) parts.push(`${days}d`)
  if (hours || days) parts.push(`${hours}h`)
  if (minutes || hours || days) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  if (!days && !hours && millis) parts.push(`${millis}ms`)

  return {
    sign,
    text: `${sign}${parts.join(' ')}`,
    days,
    hours,
    minutes,
    seconds,
    millis,
    totalMs: ms,
  }
}

export function relativeFrom(raw, timeZone = DEFAULT_TIMEZONE, now = Date.now()) {
  const date = parseInstant(raw, timeZone)
  const diff = date.getTime() - now
  const abs = Math.abs(diff)
  const past = diff < 0

  const units = [
    { label: 'year', ms: 365.25 * 24 * 3600 * 1000 },
    { label: 'month', ms: 30.44 * 24 * 3600 * 1000 },
    { label: 'week', ms: 7 * 24 * 3600 * 1000 },
    { label: 'day', ms: 24 * 3600 * 1000 },
    { label: 'hour', ms: 3600 * 1000 },
    { label: 'minute', ms: 60 * 1000 },
    { label: 'second', ms: 1000 },
  ]

  let relative = 'just now'
  for (const u of units) {
    if (abs >= u.ms) {
      const n = Math.floor(abs / u.ms)
      const label = n === 1 ? u.label : `${u.label}s`
      relative = past ? `${n} ${label} ago` : `in ${n} ${label}`
      break
    }
  }

  if (abs < 1000) relative = 'just now'

  const zoned = formatInZone(date, timeZone)
  return {
    relative,
    short: past
      ? formatDuration(diff).text.replace(/^-/, '') + ' ago'
      : 'in ' + formatDuration(diff).text,
    exact: zoned.display,
    isoUtc: zoned.isoUtc,
    diffMs: diff,
  }
}

export function calcDuration(startRaw, endRaw, timeZone = DEFAULT_TIMEZONE) {
  const start = parseInstant(startRaw, timeZone)
  const end = parseInstant(endRaw, timeZone)
  const ms = end.getTime() - start.getTime()
  return {
    start: formatInZone(start, timeZone),
    end: formatInZone(end, timeZone),
    duration: formatDuration(ms),
    ms,
  }
}

export function calcEta({ startRaw, done, total, timeZone = DEFAULT_TIMEZONE, now = Date.now() }) {
  const start = startRaw ? parseInstant(startRaw, timeZone) : new Date(now)
  const d = Number(done)
  const t = Number(total)
  if (!Number.isFinite(d) || !Number.isFinite(t) || t <= 0) throw new Error('Enter valid done/total amounts')
  if (d < 0 || d > t) throw new Error('Done must be between 0 and total')
  if (d === 0) throw new Error('Need some progress (done > 0) to estimate ETA')

  const elapsed = now - start.getTime()
  if (elapsed <= 0) throw new Error('Start time must be in the past')

  const rate = d / elapsed
  const remainingUnits = t - d
  const remainingMs = remainingUnits / rate
  const etaDate = new Date(now + remainingMs)
  const pct = (d / t) * 100

  return {
    percent: Math.round(pct * 100) / 100,
    elapsed: formatDuration(elapsed),
    remaining: formatDuration(remainingMs),
    eta: formatInZone(etaDate, timeZone),
    ratePerSec: rate * 1000,
  }
}

export function formatStopwatch(ms) {
  const abs = Math.max(0, Math.floor(ms))
  const hours = Math.floor(abs / 3600000)
  const minutes = Math.floor((abs % 3600000) / 60000)
  const seconds = Math.floor((abs % 60000) / 1000)
  const centis = Math.floor((abs % 1000) / 10)
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  return {
    display: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centis)}`,
    hours,
    minutes,
    seconds,
    ms: abs,
  }
}
