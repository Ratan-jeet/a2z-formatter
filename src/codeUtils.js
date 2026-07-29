import beautify from 'js-beautify'
import { minify as terserMinify } from 'terser'
import * as acorn from 'acorn'

export const CODE_MODES = [
  { id: 'js', label: 'JavaScript', ext: 'js' },
  { id: 'html', label: 'HTML', ext: 'html' },
  { id: 'css', label: 'CSS', ext: 'css' },
]

export const CODE_SAMPLES = {
  js: `function greet(name){
const message="Hello, "+name+"!";
console.log(message);
return {ok:true,message};
}
greet("A2Z");`,
  html: `<!DOCTYPE html>
<html>
<head><title>A2Z</title><meta charset="UTF-8"></head>
<body>
<header><h1>Welcome</h1></header>
<main><p class="lead">Format HTML easily.</p></main>
</body>
</html>`,
  css: `body{margin:0;font-family:system-ui,sans-serif;background:#0e8a8a;color:#fff}
.card{padding:16px;border-radius:8px;background:rgba(0,0,0,.2)}
.card h1{margin:0 0 8px;font-size:1.4rem}`,
}

function indentSize(indent) {
  return indent === '\t' ? 2 : Number(indent) || 2
}

export function formatCode(raw, mode, indent = 2) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Input is empty')
  const size = indentSize(indent)
  const opts = {
    indent_size: size,
    indent_char: ' ',
    end_with_newline: true,
    preserve_newlines: true,
    max_preserve_newlines: 2,
  }

  if (mode === 'js') return beautify.js(trimmed, { ...opts, space_in_empty_paren: false })
  if (mode === 'html') {
    return beautify.html(trimmed, {
      ...opts,
      wrap_line_length: 120,
      extra_liners: [],
    })
  }
  if (mode === 'css') return beautify.css(trimmed, opts)
  throw new Error('Unknown mode')
}

export async function minifyCode(raw, mode) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Input is empty')

  if (mode === 'js') {
    const result = await terserMinify(trimmed, {
      compress: true,
      mangle: true,
      format: { comments: false },
    })
    if (result.error) throw result.error
    if (!result.code) throw new Error('Minify produced empty output')
    return result.code
  }

  if (mode === 'css') {
    return trimmed
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}:;,])\s*/g, '$1')
      .replace(/;}/g, '}')
      .trim()
  }

  if (mode === 'html') {
    return trimmed
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  throw new Error('Unknown mode')
}

export function validateCode(raw, mode) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Input is empty')

  if (mode === 'js') {
    try {
      acorn.parse(trimmed, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true })
    } catch (moduleErr) {
      try {
        acorn.parse(trimmed, { ecmaVersion: 'latest', sourceType: 'script' })
      } catch (scriptErr) {
        throw new Error(moduleErr.message || scriptErr.message || 'Invalid JavaScript')
      }
    }
    return { kind: 'JavaScript', bytes: new Blob([raw]).size }
  }

  if (mode === 'html') {
    const doc = new DOMParser().parseFromString(trimmed, 'text/html')
    if (!doc.body && !doc.documentElement) throw new Error('Invalid HTML')
    return { kind: 'HTML', bytes: new Blob([raw]).size }
  }

  if (mode === 'css') {
    // Soft validation: balanced braces
    let depth = 0
    let inStr = null
    for (let i = 0; i < trimmed.length; i += 1) {
      const ch = trimmed[i]
      if (inStr) {
        if (ch === inStr && trimmed[i - 1] !== '\\') inStr = null
        continue
      }
      if (ch === '"' || ch === "'") {
        inStr = ch
        continue
      }
      if (ch === '{') depth += 1
      if (ch === '}') {
        depth -= 1
        if (depth < 0) throw new Error('Unexpected } in CSS')
      }
    }
    if (depth !== 0) throw new Error('Unbalanced { } in CSS')
    return { kind: 'CSS', bytes: new Blob([raw]).size }
  }

  throw new Error('Unknown mode')
}

export function modeAccept(mode) {
  if (mode === 'js') return '.js,.mjs,.cjs,.ts,text/javascript,application/javascript,text/plain'
  if (mode === 'html') return '.html,.htm,text/html,text/plain'
  return '.css,text/css,text/plain'
}

export function modeExt(mode) {
  return CODE_MODES.find((m) => m.id === mode)?.ext || 'txt'
}
