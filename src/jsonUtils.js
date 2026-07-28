export function parseInput(raw) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Input is empty')
  try {
    return JSON.parse(trimmed)
  } catch (err) {
    const match = String(err.message).match(/position\s+(\d+)/i)
    if (match) {
      const pos = Number(match[1])
      const before = trimmed.slice(0, pos)
      const line = before.split('\n').length
      const col = before.length - before.lastIndexOf('\n')
      throw new Error(`${err.message} (line ${line}, col ${col})`)
    }
    throw err
  }
}

export function getIndent(indent) {
  return indent === '\t' ? '\t' : Number(indent)
}

export function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = sortKeysDeep(value[key])
        return acc
      }, {})
  }
  return value
}

export function stripJsonComments(raw) {
  let out = ''
  let i = 0
  let inString = false
  let escaped = false
  while (i < raw.length) {
    const ch = raw[i]
    const next = raw[i + 1]
    if (inString) {
      out += ch
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      i += 1
      continue
    }
    if (ch === '"') {
      inString = true
      out += ch
      i += 1
      continue
    }
    if (ch === '/' && next === '/') {
      i += 2
      while (i < raw.length && raw[i] !== '\n') i += 1
      continue
    }
    if (ch === '/' && next === '*') {
      i += 2
      while (i < raw.length && !(raw[i] === '*' && raw[i + 1] === '/')) i += 1
      i += 2
      continue
    }
    out += ch
    i += 1
  }
  return out
}

export function removeTrailingCommas(raw) {
  return raw.replace(/,(\s*[}\]])/g, '$1')
}

export function repairLooseJson(raw) {
  return removeTrailingCommas(stripJsonComments(raw))
}

export function jsonToYaml(value, indent = 0) {
  const pad = '  '.repeat(indent)
  if (value === null) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    if (value === '' || /[:#\-?&*!|>%@`'"{}[\],\n]/.test(value) || value.trim() !== value) {
      return JSON.stringify(value)
    }
    return value
  }
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    return value
      .map((item) => {
        const rendered = jsonToYaml(item, indent + 1)
        if (item && typeof item === 'object') {
          const lines = rendered.split('\n')
          return `${pad}- ${lines[0]}\n${lines
            .slice(1)
            .map((line) => `${pad}  ${line}`)
            .join('\n')}`.trimEnd()
        }
        return `${pad}- ${rendered}`
      })
      .join('\n')
  }
  const entries = Object.entries(value)
  if (!entries.length) return '{}'
  return entries
    .map(([key, val]) => {
      const safeKey = /^[A-Za-z_][\w]*$/.test(key) ? key : JSON.stringify(key)
      if (val && typeof val === 'object') {
        const nested = jsonToYaml(val, indent + 1)
        if (Array.isArray(val) && !val.length) return `${pad}${safeKey}: []`
        if (!Array.isArray(val) && !Object.keys(val).length) return `${pad}${safeKey}: {}`
        return `${pad}${safeKey}:\n${nested}`
      }
      return `${pad}${safeKey}: ${jsonToYaml(val, indent + 1)}`
    })
    .join('\n')
}

export function jsonToTs(value, typeName = 'Root') {
  const seen = new Map()

  function toPascal(str) {
    return (
      String(str)
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, (_, c) => c.toUpperCase())
        .replace(/[^A-Za-z0-9]/g, '') || 'Item'
    )
  }

  function infer(val, name) {
    if (val === null) return 'null'
    if (Array.isArray(val)) {
      if (!val.length) return 'unknown[]'
      const types = [...new Set(val.map((item, i) => infer(item, `${name}Item${i}`)))]
      return types.length === 1 ? `${types[0]}[]` : `(${types.join(' | ')})[]`
    }
    if (typeof val === 'object') {
      if (seen.has(val)) return seen.get(val)
      seen.set(val, name)
      const fields = Object.entries(val)
        .map(([key, child]) => {
          const safe = /^[A-Za-z_][\w]*$/.test(key) ? key : JSON.stringify(key)
          return `  ${safe}: ${infer(child, toPascal(key))};`
        })
        .join('\n')
      return `{\n${fields}\n}`
    }
    return typeof val
  }

  return `type ${typeName} = ${infer(value, typeName)};`
}

export function jsonToXml(obj, nodeName = 'root') {
  if (obj === null) return `<${nodeName}></${nodeName}>`
  if (typeof obj !== 'object') {
    return `<${nodeName}>${String(obj)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</${nodeName}>`
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => jsonToXml(item, nodeName)).join('')
  }
  const children = Object.entries(obj)
    .map(([key, value]) => {
      const safeKey = /^[A-Za-z_][\w.-]*$/.test(key) ? key : 'item'
      return jsonToXml(value, safeKey)
    })
    .join('')
  return `<${nodeName}>${children}</${nodeName}>`
}

export function jsonToCsv(obj) {
  const rows = Array.isArray(obj) ? obj : [obj]
  if (!rows.length || typeof rows[0] !== 'object' || rows[0] === null) {
    throw new Error('CSV conversion needs an array of objects')
  }
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const escapeCell = (v) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = keys.join(',')
  const body = rows.map((row) => keys.map((k) => escapeCell(row[k])).join(',')).join('\n')
  return `${header}\n${body}`
}

export function collectStats(value) {
  const stats = {
    keys: 0,
    objects: 0,
    arrays: 0,
    strings: 0,
    numbers: 0,
    booleans: 0,
    nulls: 0,
    depth: 0,
  }

  function walk(node, depth) {
    stats.depth = Math.max(stats.depth, depth)
    if (node === null) {
      stats.nulls += 1
      return
    }
    if (Array.isArray(node)) {
      stats.arrays += 1
      node.forEach((item) => walk(item, depth + 1))
      return
    }
    if (typeof node === 'object') {
      stats.objects += 1
      const keys = Object.keys(node)
      stats.keys += keys.length
      keys.forEach((key) => walk(node[key], depth + 1))
      return
    }
    if (typeof node === 'string') stats.strings += 1
    else if (typeof node === 'number') stats.numbers += 1
    else if (typeof node === 'boolean') stats.booleans += 1
  }

  walk(value, 1)
  return stats
}

export function getByPath(obj, path) {
  const cleaned = path.trim().replace(/^\$\.?/, '')
  if (!cleaned) return obj
  const parts = cleaned
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
  let cur = obj
  for (const part of parts) {
    if (cur == null) throw new Error(`Path not found: ${path}`)
    cur = cur[part]
  }
  return cur
}

export function flattenJson(value, prefix = '', out = {}) {
  if (value === null || typeof value !== 'object') {
    out[prefix || 'value'] = value
    return out
  }
  if (Array.isArray(value)) {
    if (!value.length) out[prefix || 'root'] = []
    value.forEach((item, i) => flattenJson(item, prefix ? `${prefix}.${i}` : String(i), out))
    return out
  }
  const keys = Object.keys(value)
  if (!keys.length) out[prefix || 'root'] = {}
  keys.forEach((key) => {
    const next = prefix ? `${prefix}.${key}` : key
    flattenJson(value[key], next, out)
  })
  return out
}

export function unflattenJson(flat) {
  if (!flat || typeof flat !== 'object' || Array.isArray(flat)) {
    throw new Error('Unflatten needs a flat object of path keys')
  }
  const root = {}
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.')
    let cur = root
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const nextIsIndex = !isLast && /^\d+$/.test(parts[i + 1])
      if (isLast) {
        cur[part] = value
      } else {
        if (cur[part] == null) cur[part] = nextIsIndex ? [] : {}
        cur = cur[part]
      }
    }
  }
  return root
}

function sameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function walkDiff(left, right, path, changes) {
  if (sameValue(left, right)) return
  const leftObj = left && typeof left === 'object'
  const rightObj = right && typeof right === 'object'
  if (!leftObj || !rightObj || Array.isArray(left) !== Array.isArray(right)) {
    if (left === undefined) changes.push({ type: 'added', path, value: right })
    else if (right === undefined) changes.push({ type: 'removed', path, value: left })
    else changes.push({ type: 'changed', path, from: left, to: right })
    return
  }
  if (Array.isArray(left)) {
    const max = Math.max(left.length, right.length)
    for (let i = 0; i < max; i += 1) {
      walkDiff(left[i], right[i], `${path}[${i}]`, changes)
    }
    return
  }
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    const next = path ? `${path}.${key}` : key
    walkDiff(left[key], right[key], next, changes)
  }
}

export function diffJson(left, right) {
  const changes = []
  walkDiff(left, right, '', changes)
  return changes.map((c) => ({
    ...c,
    path: c.path || '(root)',
  }))
}

const HISTORY_KEY = 'json-formatter-history'
const THEME_KEY = 'json-formatter-theme'

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveHistoryEntry(text) {
  const trimmed = text.trim()
  if (!trimmed) return loadHistory()
  const preview = trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed
  const next = [
    { id: Date.now(), preview, text: trimmed.slice(0, 200000) },
    ...loadHistory().filter((h) => h.text !== trimmed),
  ].slice(0, 12)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  return next
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
  return []
}

export function loadTheme() {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme)
}

export function encodeSharePayload(text) {
  return btoa(unescape(encodeURIComponent(text)))
}

export function decodeSharePayload(encoded) {
  return decodeURIComponent(escape(atob(encoded)))
}
