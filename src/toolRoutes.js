/** Canonical path for each tool id (JSON home is `/`). */
export const TOOL_PATHS = {
  json: '/',
  xml: '/xml',
  yaml: '/yaml',
  code: '/js',
  diff: '/diff',
  encode: '/encode',
  markdown: '/markdown',
  sql: '/sql',
  cron: '/cron',
  hash: '/hash',
  regex: '/regex',
}

const ALIASES = {
  '': 'json',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  js: 'code',
  code: 'code',
  html: 'code',
  css: 'code',
  javascript: 'code',
  diff: 'diff',
  encode: 'encode',
  markdown: 'markdown',
  md: 'markdown',
  sql: 'sql',
  cron: 'cron',
  hash: 'hash',
  regex: 'regex',
}

export function toolFromPath(pathname = window.location.pathname) {
  const raw = pathname.replace(/\/+$/, '') || '/'
  const segment = raw === '/' ? '' : raw.slice(1).toLowerCase()
  return ALIASES[segment] || 'json'
}

export function pathForTool(toolId) {
  return TOOL_PATHS[toolId] || '/'
}

export function navigateToTool(toolId, { replace = false } = {}) {
  const path = pathForTool(toolId)
  const next = `${path}${window.location.search || ''}${window.location.hash || ''}`
  const current = `${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`
  if (current === next) return
  if (replace) window.history.replaceState({ tool: toolId }, '', next)
  else window.history.pushState({ tool: toolId }, '', next)
}
