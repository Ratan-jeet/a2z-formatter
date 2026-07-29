import { parse as parseYamlDoc, stringify } from 'yaml'

export function getIndent(indent) {
  return indent === '\t' ? 2 : Number(indent) || 2
}

export function parseYaml(raw) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Input is empty')
  try {
    return parseYamlDoc(trimmed)
  } catch (err) {
    const message = err?.message || String(err)
    const line = err?.linePos?.[0]?.line
    const col = err?.linePos?.[0]?.col
    if (line != null) {
      throw new Error(`${message} (line ${line}, col ${col ?? 1})`)
    }
    throw new Error(message)
  }
}

export function formatYaml(raw, indent = 2) {
  const value = parseYaml(raw)
  const spaces = getIndent(indent)
  return stringify(value, {
    indent: spaces,
    lineWidth: 0,
  }).trimEnd() + '\n'
}

export function minifyYaml(raw) {
  const value = parseYaml(raw)
  // Compact flow-style where practical
  return stringify(value, {
    indent: 0,
    lineWidth: 0,
    defaultKeyType: 'PLAIN',
    defaultStringType: 'PLAIN',
    flowCollectionPadding: false,
  })
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function validateYaml(raw) {
  const value = parseYaml(raw)
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  return {
    type,
    bytes: new Blob([raw]).size,
  }
}

export function yamlToJson(raw, indent = 2) {
  const value = parseYaml(raw)
  return JSON.stringify(value, null, getIndent(indent))
}

export function jsonTextToYaml(raw, indent = 2) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Input is empty')
  let value
  try {
    value = JSON.parse(trimmed)
  } catch (err) {
    throw new Error(err.message || 'Invalid JSON')
  }
  return stringify(value, {
    indent: getIndent(indent),
    lineWidth: 0,
  }).trimEnd() + '\n'
}

export const YAML_SAMPLE = `name: A2Z Formatter
version: 1.2
active: true
owner: null
features:
  - format
  - minify
  - validate
meta:
  created: 2026-07-29
  tags:
    - utility
    - yaml
`
