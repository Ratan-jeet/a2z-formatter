export function getIndent(indent) {
  return indent === '\t' ? '\t' : Number(indent)
}

export function parseXml(raw) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Input is empty')

  const parser = new DOMParser()
  const doc = parser.parseFromString(trimmed, 'application/xml')
  const err = doc.querySelector('parsererror')
  if (err) {
    const text = (err.textContent || 'Invalid XML').replace(/\s+/g, ' ').trim()
    throw new Error(text.slice(0, 240))
  }
  return doc
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function padOf(indent, depth) {
  const unit = indent === '\t' ? '\t' : ' '.repeat(Number(indent) || 2)
  return unit.repeat(depth)
}

function serializeNode(node, indent, depth) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent.replace(/\s+/g, ' ').trim()
    if (!text) return ''
    return `${padOf(indent, depth)}${escapeText(text)}\n`
  }

  if (node.nodeType === Node.CDATA_SECTION_NODE) {
    return `${padOf(indent, depth)}<![CDATA[${node.data}]]>\n`
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    return `${padOf(indent, depth)}<!--${node.data}-->\n`
  }

  if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
    return `${padOf(indent, depth)}<?${node.target} ${node.data}?>\n`
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const name = node.tagName
  let attrs = ''
  for (const attr of Array.from(node.attributes || [])) {
    attrs += ` ${attr.name}="${escapeAttr(attr.value)}"`
  }

  const children = Array.from(node.childNodes || []).filter((child) => {
    if (child.nodeType === Node.TEXT_NODE) return child.textContent.trim().length > 0
    return true
  })

  if (!children.length) {
    return `${padOf(indent, depth)}<${name}${attrs}/>\n`
  }

  const onlyText =
    children.length === 1 && children[0].nodeType === Node.TEXT_NODE

  if (onlyText) {
    const text = children[0].textContent.replace(/\s+/g, ' ').trim()
    return `${padOf(indent, depth)}<${name}${attrs}>${escapeText(text)}</${name}>\n`
  }

  let out = `${padOf(indent, depth)}<${name}${attrs}>\n`
  for (const child of children) {
    out += serializeNode(child, indent, depth + 1)
  }
  out += `${padOf(indent, depth)}</${name}>\n`
  return out
}

export function formatXml(raw, indent = 2) {
  const doc = parseXml(raw)
  let out = ''

  const decl = raw.trim().match(/^<\?xml\b[^?]*\?>/i)
  if (decl) out += `${decl[0]}\n`

  for (const child of Array.from(doc.childNodes)) {
    if (child.nodeType === Node.DOCUMENT_TYPE_NODE) {
      out += `<!DOCTYPE ${child.name}>\n`
      continue
    }
    // Skip XML declaration node if parser exposed it as processing instruction
    if (
      child.nodeType === Node.PROCESSING_INSTRUCTION_NODE &&
      String(child.target).toLowerCase() === 'xml'
    ) {
      continue
    }
    out += serializeNode(child, indent, 0)
  }

  return out.trimEnd() + '\n'
}

export function minifyXml(raw) {
  const doc = parseXml(raw)
  const serializer = new XMLSerializer()
  let out = ''

  const decl = raw.trim().match(/^<\?xml\b[^?]*\?>/i)
  if (decl) out += decl[0]

  for (const child of Array.from(doc.childNodes)) {
    if (
      child.nodeType === Node.PROCESSING_INSTRUCTION_NODE &&
      String(child.target).toLowerCase() === 'xml'
    ) {
      continue
    }
    out += serializer.serializeToString(child)
  }

  return out.replace(/>\s+</g, '><').trim()
}

export function validateXml(raw) {
  const doc = parseXml(raw)
  const elements = doc.getElementsByTagName('*').length
  return {
    elements,
    bytes: new Blob([raw]).size,
  }
}

export function xmlToJson(raw) {
  const doc = parseXml(raw)

  function nodeToValue(node) {
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
      const text = node.textContent.trim()
      return text || undefined
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return undefined

    const obj = {}
    for (const attr of Array.from(node.attributes || [])) {
      obj[`@${attr.name}`] = attr.value
    }

    const childMap = {}
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
        const text = child.textContent.trim()
        if (text) {
          if (obj['#text']) obj['#text'] += text
          else obj['#text'] = text
        }
        continue
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue
      const value = nodeToValue(child)
      const key = child.tagName
      if (childMap[key] === undefined) childMap[key] = value
      else if (Array.isArray(childMap[key])) childMap[key].push(value)
      else childMap[key] = [childMap[key], value]
    }

    Object.assign(obj, childMap)

    const keys = Object.keys(obj)
    if (keys.length === 1 && keys[0] === '#text') return obj['#text']
    if (!keys.length) return ''
    return obj
  }

  const root = doc.documentElement
  if (!root) throw new Error('No root element')
  return { [root.tagName]: nodeToValue(root) }
}

export const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <user id="1" active="true">
    <name>Ada</name>
    <tags>
      <tag>dev</tag>
      <tag>ai</tag>
    </tags>
  </user>
</root>
`
