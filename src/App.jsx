import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting, foldAll, unfoldAll } from '@codemirror/language'
import { undo, redo } from '@codemirror/commands'
import { openSearchPanel } from '@codemirror/search'
import { tags as t } from '@lezer/highlight'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  parseInput,
  getIndent,
  sortKeysDeep,
  repairLooseJson,
  jsonToYaml,
  jsonToTs,
  jsonToXml,
  jsonToCsv,
  collectStats,
  getByPath,
  flattenJson,
  unflattenJson,
  diffJson,
  loadHistory,
  saveHistoryEntry,
  clearHistory,
  loadTheme,
  saveTheme,
  encodeSharePayload,
  decodeSharePayload,
} from './jsonUtils'
import { HowToUseModal, TourOverlay, TOUR_STEPS } from './HelpGuide'
import XmlWorkspace from './XmlWorkspace'
import YamlWorkspace from './YamlWorkspace'
import CodeWorkspace from './CodeWorkspace'
import './App.css'

const TOOLS = [
  { id: 'json', label: 'JSON', ready: true },
  { id: 'xml', label: 'XML', ready: true },
  { id: 'yaml', label: 'YAML', ready: true },
  { id: 'code', label: 'JS / HTML / CSS', ready: true },
]

const SAMPLE = `{
  "name": "A2Z Formatter",
  "version": 1.2,
  "active": true,
  "owner": null,
  "features": ["format", "minify", "validate", "tree", "diff"],
  "meta": {
    "created": "2026-07-29",
    "tags": ["utility", "devtools"]
  }
}`

const lightHighlight = HighlightStyle.define([
  { tag: t.propertyName, color: '#0b6e99' },
  { tag: t.string, color: '#0a7a3e' },
  { tag: t.number, color: '#b35c00' },
  { tag: t.bool, color: '#9b1d6d' },
  { tag: t.null, color: '#9b1d6d' },
  { tag: t.punctuation, color: '#444' },
  { tag: t.bracket, color: '#1a1a1a' },
  { tag: t.squareBracket, color: '#1a1a1a' },
  { tag: t.brace, color: '#1a1a1a' },
  { tag: t.separator, color: '#666' },
  { tag: t.invalid, color: '#c62828' },
])

const INDENT_OPTIONS = [
  { label: '2 Spaces', value: 2 },
  { label: '3 Spaces', value: 3 },
  { label: '4 Spaces', value: 4 },
  { label: 'Tab', value: '\t' },
]

function Icon({ children, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

const Ico = {
  fold: (
    <Icon>
      <path d="M4 6h10M4 12h7M4 18h10" />
      <path d="M18 8l3 3-3 3" />
    </Icon>
  ),
  unfold: (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  ),
  sort: (
    <Icon>
      <path d="M4 6h10M4 12h7M4 18h4" />
      <path d="M17 8v10M14 15l3 3 3-3" />
    </Icon>
  ),
  filter: (
    <Icon>
      <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" />
    </Icon>
  ),
  wrench: (
    <Icon>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 2.4-8.4z" />
    </Icon>
  ),
  undo: (
    <Icon>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h9a6 6 0 0 1 0 12h-2" />
    </Icon>
  ),
  redo: (
    <Icon>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H11a6 6 0 0 0 0 12h2" />
    </Icon>
  ),
  sample: (
    <Icon>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </Icon>
  ),
  paste: (
    <Icon>
      <path d="M8 5h8v3H8z" />
      <rect x="6" y="8" width="12" height="12" rx="2" />
    </Icon>
  ),
  folder: (
    <Icon>
      <path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </Icon>
  ),
  save: (
    <Icon>
      <path d="M5 4h11l3 3v13H5V4z" />
      <path d="M8 4v5h8V4M8 18h8" />
    </Icon>
  ),
  check: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l2.5 2.5L16 9" />
    </Icon>
  ),
  print: (
    <Icon>
      <path d="M7 9V4h10v5" />
      <path d="M7 15H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" />
      <rect x="7" y="13" width="10" height="7" />
    </Icon>
  ),
  clear: (
    <Icon>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  ),
  copy: (
    <Icon>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M5 14V5a2 2 0 0 1 2-2h9" />
    </Icon>
  ),
  fullscreen: (
    <Icon>
      <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
    </Icon>
  ),
  download: (
    <Icon>
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </Icon>
  ),
  shield: (
    <Icon>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </Icon>
  ),
}

function ToolBtn({ title, onClick, children, disabled = false, label }) {
  return (
    <button type="button" className="tool-icon" title={title} aria-label={title} onClick={onClick} disabled={disabled}>
      {children}
      {label ? <span className="tool-label">{label}</span> : null}
    </button>
  )
}

function TreeNode({ name, value, path, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2)
  const isObj = value && typeof value === 'object'
  const label = Array.isArray(value)
    ? `Array(${value.length})`
    : value && typeof value === 'object'
      ? `Object(${Object.keys(value).length})`
      : null

  if (!isObj) {
    return (
      <div className="tree-row" style={{ paddingLeft: depth * 14 }}>
        <span className="tree-key">{name}</span>
        <span className="tree-sep">:</span>
        <span className={`tree-val type-${value === null ? 'null' : typeof value}`}>
          {JSON.stringify(value)}
        </span>
      </div>
    )
  }

  const entries = Array.isArray(value)
    ? value.map((item, i) => [String(i), item])
    : Object.entries(value)

  return (
    <div className="tree-node">
      <button
        type="button"
        className="tree-row tree-toggle"
        style={{ paddingLeft: depth * 14 }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="tree-caret">{open ? '▼' : '▶'}</span>
        <span className="tree-key">{name}</span>
        <span className="tree-sep">:</span>
        <span className="tree-meta">{label}</span>
      </button>
      {open &&
        entries.map(([key, child]) => (
          <TreeNode
            key={`${path}.${key}`}
            name={key}
            value={child}
            path={`${path}.${key}`}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}

function EditorPane({
  title,
  value,
  onChange,
  theme,
  language = 'json',
  variant = 'input',
  onClear,
  onCopy,
  onLoadSample,
  onUpload,
  onPaste,
  onValidate,
  onSort,
  onBeautifyLocal,
  onDownload,
  onOpenAdvanced,
  onNotify,
  fileInputRef,
  mode = 'code',
  onModeChange,
  treeData = null,
  diffRows = null,
  tourId,
  acceptFiles,
}) {
  const viewRef = useRef(null)
  const paneRef = useRef(null)
  const [fullscreen, setFullscreen] = useState(false)

  const extensions = useMemo(() => {
    let langExt = json()
    if (language === 'xml') langExt = xml()
    else if (language === 'yaml') langExt = yaml()
    else if (language === 'javascript') langExt = javascript()
    else if (language === 'html') langExt = html()
    else if (language === 'css') langExt = css()
    const base = [langExt, EditorView.lineWrapping]
    if (theme === 'dark') return [...base, oneDark]
    return [...base, syntaxHighlighting(lightHighlight)]
  }, [theme, language])

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const runView = (fn) => {
    const view = viewRef.current
    if (!view) return
    fn(view)
  }

  const toggleFullscreen = async () => {
    const el = paneRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) await el.requestFullscreen()
      else await document.exitFullscreen()
    } catch {
      /* ignore */
    }
  }

  const handlePrint = () => {
    if (!value.trim()) {
      onNotify?.('err', 'Nothing to print')
      return
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
    document.body.appendChild(iframe)

    const win = iframe.contentWindow
    const doc = win?.document
    if (!win || !doc) {
      iframe.remove()
      onNotify?.('err', 'Print failed')
      return
    }

    doc.open()
    doc.write(`<!DOCTYPE html><html><head><title>Print JSON</title>
      <style>
        body {
          margin: 0;
          padding: 16px;
          color: #111;
          background: #fff;
          font-family: "IBM Plex Mono", ui-monospace, monospace;
          font-size: 12px;
          line-height: 1.45;
          white-space: pre-wrap;
          word-break: break-word;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head><body></body></html>`)
    doc.close()
    doc.body.textContent = value

    const cleanup = () => {
      setTimeout(() => iframe.remove(), 500)
    }

    win.addEventListener('afterprint', cleanup)
    win.focus()
    win.print()
    // Fallback if afterprint never fires
    setTimeout(cleanup, 2000)
  }

  return (
    <section className={`editor-pane ${fullscreen ? 'is-fullscreen' : ''}`} data-tour={tourId} ref={paneRef}>
      <div className="editor-toolbar icon-toolbar">
        <div className="toolbar-icons">
          <ToolBtn title="Fold all" onClick={() => runView((v) => foldAll(v))}>
            {Ico.fold}
          </ToolBtn>
          <ToolBtn title="Unfold all" onClick={() => runView((v) => unfoldAll(v))}>
            {Ico.unfold}
          </ToolBtn>
          {onSort && (
            <ToolBtn title="Sort keys" onClick={onSort}>
              {Ico.sort}
            </ToolBtn>
          )}
          <ToolBtn title="Find / filter" onClick={() => runView((v) => openSearchPanel(v))}>
            {Ico.filter}
          </ToolBtn>
          {onOpenAdvanced && (
            <ToolBtn title="Advanced tools" onClick={onOpenAdvanced}>
              {Ico.wrench}
            </ToolBtn>
          )}
          <ToolBtn title="Undo" onClick={() => runView((v) => undo(v))}>
            {Ico.undo}
          </ToolBtn>
          <ToolBtn title="Redo" onClick={() => runView((v) => redo(v))}>
            {Ico.redo}
          </ToolBtn>

          <span className="tool-sep" />

          {onLoadSample && (
            <ToolBtn title="Load sample" label="Sample" onClick={onLoadSample}>
              {Ico.sample}
            </ToolBtn>
          )}
          {onPaste && (
            <ToolBtn title="Paste" onClick={onPaste}>
              {Ico.paste}
            </ToolBtn>
          )}
          {onUpload && (
            <>
              <ToolBtn title="Open file" onClick={() => fileInputRef?.current?.click()}>
                {Ico.folder}
              </ToolBtn>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptFiles || '.json,application/json,text/plain,.txt,.yaml,.yml,.xml,text/xml'}
                hidden
                onChange={onUpload}
              />
            </>
          )}
          {onDownload && (
            <ToolBtn title="Save / download" onClick={onDownload}>
              {Ico.save}
            </ToolBtn>
          )}
          {onValidate && (
            <ToolBtn title="Validate" onClick={onValidate}>
              {Ico.check}
            </ToolBtn>
          )}
          <ToolBtn title="Print" onClick={handlePrint}>
            {Ico.print}
          </ToolBtn>
          {onClear && (
            <ToolBtn title="Clear" onClick={onClear}>
              {Ico.clear}
            </ToolBtn>
          )}
          <ToolBtn title="Copy" onClick={onCopy}>
            {Ico.copy}
          </ToolBtn>

          {variant === 'output' && onModeChange && (
            <>
              <span className="tool-sep" />
              <label className="tool-select-wrap" title="Output view">
                <select
                  className="tool-select"
                  value={mode}
                  onChange={(e) => onModeChange(e.target.value)}
                >
                  <option value="code">Code</option>
                  <option value="tree">Tree</option>
                  <option value="diff">Diff</option>
                </select>
              </label>
              <ToolBtn title="Validate output JSON" onClick={onValidate}>
                {Ico.shield}
              </ToolBtn>
            </>
          )}

          <ToolBtn title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
            {Ico.fullscreen}
          </ToolBtn>
        </div>
        <span className="editor-title">{title}</span>
      </div>
      <div className={`editor-body theme-${theme}`}>
        {mode === 'tree' && treeData !== null ? (
          <div className="tree-view">
            <TreeNode name="root" value={treeData} path="root" />
          </div>
        ) : mode === 'diff' && diffRows ? (
          <div className="diff-view">
            {diffRows.length === 0 ? (
              <p className="diff-empty">No differences</p>
            ) : (
              diffRows.map((row, i) => (
                <div key={`${row.path}-${i}`} className={`diff-row diff-${row.type}`}>
                  <span className="diff-type">{row.type}</span>
                  <span className="diff-path">{row.path}</span>
                  <span className="diff-detail">
                    {row.type === 'changed'
                      ? `${JSON.stringify(row.from)} → ${JSON.stringify(row.to)}`
                      : JSON.stringify(row.value)}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <CodeMirror
            value={value}
            height="100%"
            theme={theme}
            extensions={extensions}
            onChange={onChange}
            onCreateEditor={(view) => {
              viewRef.current = view
            }}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              searchKeymap: true,
              history: true,
            }}
          />
        )}
      </div>
      <div className="editor-status">
        {value.length.toLocaleString()} chars · {value ? value.split('\n').length : 0} lines
      </div>
    </section>
  )
}

export default function App() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indent, setIndent] = useState(2)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [convertTo, setConvertTo] = useState('xml')
  const [viewMode, setViewMode] = useState('code')
  const [pathQuery, setPathQuery] = useState('')
  const [theme, setTheme] = useState(loadTheme)
  const [history, setHistory] = useState(loadHistory)
  const [showHistory, setShowHistory] = useState(false)
  const [diffRows, setDiffRows] = useState([])
  const [showHowTo, setShowHowTo] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [tourStep, setTourStep] = useState(null)
  const [activeTool, setActiveTool] = useState('json')
  const fileInputRef = useRef(null)

  const startTour = useCallback(() => {
    setShowHowTo(false)
    setShowHistory(false)
    setActiveTool('json')
    setTourStep(0)
  }, [])

  const closeTour = useCallback(() => setTourStep(null), [])

  const nextTour = useCallback(() => {
    setTourStep((i) => {
      if (i == null) return null
      if (i >= TOUR_STEPS.length - 1) return null
      return i + 1
    })
  }, [])

  const backTour = useCallback(() => {
    setTourStep((i) => (i == null || i <= 0 ? i : i - 1))
  }, [])

  const showStatus = useCallback((type, message) => {
    setStatus({ type, message })
  }, [])

  const remember = useCallback((text) => {
    setHistory(saveHistoryEntry(text))
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash.startsWith('data=')) return
    try {
      const decoded = decodeSharePayload(hash.slice(5))
      setInput(decoded)
      showStatus('ok', 'Loaded shared JSON from URL')
    } catch {
      showStatus('err', 'Invalid share link')
    }
  }, [showStatus])

  const stats = useMemo(() => {
    try {
      if (!input.trim()) return null
      return collectStats(parseInput(input))
    } catch {
      return null
    }
  }, [input])

  const treeData = useMemo(() => {
    try {
      if (!output.trim()) return null
      return JSON.parse(output)
    } catch {
      return null
    }
  }, [output])

  const handleValidate = () => {
    try {
      const parsed = parseInput(input)
      const s = collectStats(parsed)
      remember(input)
      showStatus(
        'ok',
        `Valid JSON · ${s.keys} keys · depth ${s.depth} · ${new Blob([input]).size} bytes`,
      )
    } catch (err) {
      showStatus('err', err.message)
    }
  }

  const handleValidateOutput = () => {
    try {
      parseInput(output)
      showStatus('ok', 'Output is valid JSON')
    } catch (err) {
      showStatus('err', `Output: ${err.message}`)
    }
  }

  const putErrorInOutput = useCallback(
    (err) => {
      const message = err?.message || String(err)
      setViewMode('code')
      setDiffRows([])
      setOutput(`Error: Invalid JSON\n\n${message}`)
      showStatus('err', message)
    },
    [showStatus],
  )

  const handleFormat = useCallback(() => {
    try {
      let repaired = false
      let parsed
      try {
        parsed = parseInput(input)
      } catch {
        parsed = parseInput(repairLooseJson(input))
        repaired = true
      }
      setOutput(JSON.stringify(parsed, null, getIndent(indent)))
      setViewMode('code')
      remember(input)
      showStatus(
        'ok',
        repaired
          ? 'Repaired (comments/trailing commas) and formatted'
          : 'Formatted successfully',
      )
    } catch (err) {
      putErrorInOutput(err)
    }
  }, [indent, input, putErrorInOutput, remember, showStatus])

  const handleMinify = useCallback(() => {
    try {
      let repaired = false
      let parsed
      try {
        parsed = parseInput(input)
      } catch {
        parsed = parseInput(repairLooseJson(input))
        repaired = true
      }
      setOutput(JSON.stringify(parsed))
      setViewMode('code')
      remember(input)
      showStatus(
        'ok',
        repaired ? 'Repaired and minified successfully' : 'Minified successfully',
      )
    } catch (err) {
      putErrorInOutput(err)
    }
  }, [input, putErrorInOutput, remember, showStatus])

  const beautifyInPlace = (which) => {
    try {
      const raw = which === 'input' ? input : output
      const parsed = parseInput(raw)
      const text = JSON.stringify(parsed, null, getIndent(indent))
      if (which === 'input') setInput(text)
      else {
        setOutput(text)
        setViewMode('code')
      }
      showStatus('ok', 'Beautified in place')
    } catch (err) {
      putErrorInOutput(err)
    }
  }

  const sortInPlace = (which) => {
    try {
      const raw = which === 'input' ? input : output
      const parsed = sortKeysDeep(parseInput(raw))
      const text = JSON.stringify(parsed, null, getIndent(indent))
      if (which === 'input') setInput(text)
      else {
        setOutput(text)
        setViewMode('code')
      }
      showStatus('ok', 'Keys sorted')
    } catch (err) {
      putErrorInOutput(err)
    }
  }

  const handleSortKeys = () => {
    try {
      const parsed = sortKeysDeep(parseInput(input))
      setOutput(JSON.stringify(parsed, null, getIndent(indent)))
      setViewMode('code')
      showStatus('ok', 'Keys sorted alphabetically')
    } catch (err) {
      showStatus('err', err.message)
    }
  }

  const handleRepair = () => {
    try {
      const repaired = repairLooseJson(input)
      const parsed = parseInput(repaired)
      setInput(JSON.stringify(parsed, null, getIndent(indent)))
      showStatus('ok', 'Removed comments & trailing commas')
    } catch (err) {
      showStatus('err', `Could not repair: ${err.message}`)
    }
  }

  const handleEscape = () => {
    if (!input.trim()) {
      showStatus('err', 'Input is empty')
      return
    }
    setOutput(JSON.stringify(input))
    setViewMode('code')
    showStatus('ok', 'Escaped as JSON string')
  }

  const handleUnescape = () => {
    try {
      const parsed = parseInput(input)
      if (typeof parsed !== 'string') throw new Error('Input must be a JSON string to unescape')
      setOutput(parsed)
      setViewMode('code')
      showStatus('ok', 'Unescaped JSON string')
    } catch (err) {
      showStatus('err', err.message)
    }
  }

  const handleBase64 = (mode) => {
    try {
      if (mode === 'encode') {
        const text = output || input
        if (!text.trim()) throw new Error('Nothing to encode')
        setOutput(btoa(unescape(encodeURIComponent(text))))
        setViewMode('code')
        showStatus('ok', 'Encoded to Base64')
      } else {
        const decoded = decodeURIComponent(escape(atob(input.trim())))
        setOutput(decoded)
        setViewMode('code')
        showStatus('ok', 'Decoded from Base64')
      }
    } catch (err) {
      showStatus('err', err.message || 'Base64 operation failed')
    }
  }

  const handleFlatten = () => {
    try {
      const flat = flattenJson(parseInput(input))
      setOutput(JSON.stringify(flat, null, getIndent(indent)))
      setViewMode('code')
      showStatus('ok', 'Flattened JSON paths')
    } catch (err) {
      showStatus('err', err.message)
    }
  }

  const handleUnflatten = () => {
    try {
      const nested = unflattenJson(parseInput(input))
      setOutput(JSON.stringify(nested, null, getIndent(indent)))
      setViewMode('code')
      showStatus('ok', 'Unflattened JSON')
    } catch (err) {
      showStatus('err', err.message)
    }
  }

  const handleDiff = () => {
    try {
      if (!output.trim()) throw new Error('Format or paste comparison JSON into Output first')
      const left = parseInput(input)
      const right = JSON.parse(output)
      const rows = diffJson(left, right)
      setDiffRows(rows)
      setViewMode('diff')
      showStatus('ok', rows.length ? `${rows.length} difference(s)` : 'JSON values are identical')
    } catch (err) {
      showStatus('err', err.message)
    }
  }

  const handleConvert = () => {
    try {
      const parsed = parseInput(input)
      if (convertTo === 'xml') {
        setOutput(`<?xml version="1.0" encoding="UTF-8"?>\n${jsonToXml(parsed)}`)
        showStatus('ok', 'Converted to XML')
      } else if (convertTo === 'csv') {
        setOutput(jsonToCsv(parsed))
        showStatus('ok', 'Converted to CSV')
      } else if (convertTo === 'yaml') {
        setOutput(jsonToYaml(parsed))
        showStatus('ok', 'Converted to YAML')
      } else if (convertTo === 'ts') {
        setOutput(jsonToTs(parsed))
        showStatus('ok', 'Converted to TypeScript type')
      }
      setViewMode('code')
      remember(input)
    } catch (err) {
      putErrorInOutput(err)
    }
  }

  const handlePathQuery = () => {
    try {
      const parsed = parseInput(input)
      const result = getByPath(parsed, pathQuery || '$')
      setOutput(JSON.stringify(result, null, getIndent(indent)))
      setViewMode('code')
      showStatus('ok', `Path result: ${pathQuery || '$'}`)
    } catch (err) {
      showStatus('err', err.message)
    }
  }

  const downloadText = (content, name = 'data.json') => {
    if (!content.trim()) {
      showStatus('err', 'Nothing to download')
      return
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    showStatus('ok', `Downloaded ${name}`)
  }

  const handleDownload = () => {
    const content = output || input
    let ext = 'json'
    if (convertTo === 'xml' && content.includes('<')) ext = 'xml'
    else if (convertTo === 'csv' && content.includes(',')) ext = 'csv'
    else if (convertTo === 'yaml') ext = 'yaml'
    else if (convertTo === 'ts') ext = 'ts'
    downloadText(content, `data.${ext}`)
  }

  const handleShare = async () => {
    const text = input.trim()
    if (!text) {
      showStatus('err', 'Nothing to share')
      return
    }
    try {
      const url = `${window.location.origin}${window.location.pathname}#data=${encodeSharePayload(text)}`
      window.location.hash = `data=${encodeSharePayload(text)}`
      await navigator.clipboard.writeText(url)
      remember(text)
      showStatus('ok', 'Share link copied')
    } catch (err) {
      showStatus('err', err.message || 'Share failed')
    }
  }

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setInput(String(reader.result ?? ''))
      showStatus('ok', `Loaded ${file.name}`)
    }
    reader.onerror = () => showStatus('err', 'Failed to read file')
    reader.readAsText(file)
    e.target.value = ''
  }

  const copyText = async (text) => {
    if (!text) {
      showStatus('err', 'Nothing to copy')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      showStatus('ok', 'Copied to clipboard')
    } catch {
      showStatus('err', 'Copy failed')
    }
  }

  const pasteToInput = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setInput(text)
      showStatus('ok', 'Pasted from clipboard')
    } catch {
      showStatus('err', 'Clipboard paste blocked — use Ctrl+V')
    }
  }

  const swapPanels = () => {
    setInput(output)
    setOutput(input)
    setViewMode('code')
    showStatus('ok', 'Swapped input ↔ output')
  }

  const useOutputAsInput = () => {
    if (!output.trim()) {
      showStatus('err', 'Output is empty')
      return
    }
    setInput(output)
    showStatus('ok', 'Output moved to input')
  }

  const handleModeChange = (mode) => {
    if (mode === 'tree' && !treeData) {
      showStatus('err', 'Output must be valid JSON for tree view')
      return
    }
    if (mode === 'diff') {
      handleDiff()
      return
    }
    setViewMode(mode)
  }

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 'Enter') {
        e.preventDefault()
        handleFormat()
      } else if (e.key.toLowerCase() === 'm' && e.shiftKey) {
        e.preventDefault()
        handleMinify()
      } else if (e.key.toLowerCase() === 's' && e.shiftKey) {
        e.preventDefault()
        handleShare()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleFormat, handleMinify])

  return (
    <div className={`app theme-${theme}`}>
      <header className="header">
        <div className="header-left">
          <div className="brand">
            <span className="brand-mark">A2Z</span>
            <span className="brand-name">formatter</span>
          </div>
          <nav className="tool-tabs" aria-label="Formatter tools" data-tour="tour-tools-tabs">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={`tool-tab ${activeTool === tool.id ? 'is-active' : ''} ${tool.ready ? '' : 'is-soon'}`}
                onClick={() => {
                  setActiveTool(tool.id)
                  if (!tool.ready) {
                    showStatus('ok', `${tool.label} formatter is coming soon`)
                  }
                }}
              >
                {tool.label}
                {!tool.ready && <span className="tool-soon">Soon</span>}
              </button>
            ))}
          </nav>
        </div>
        <div className="header-right" data-tour="tour-header-actions">
          {activeTool === 'json' && stats && (
            <div className="header-stats">
              <span>{stats.keys} keys</span>
              <span>{stats.objects} objs</span>
              <span>{stats.arrays} arrs</span>
              <span>depth {stats.depth}</span>
            </div>
          )}
          <button type="button" className="header-btn" onClick={startTour} title="Take a quick tour">
            Tour
          </button>
          <button
            type="button"
            className="header-btn"
            onClick={() => setShowHowTo(true)}
            title="How to use this tool"
          >
            How to use
          </button>
          <button
            type="button"
            className="header-btn"
            onClick={() => setShowHistory((v) => !v)}
            title="Recent history"
          >
            History
          </button>
          <button
            type="button"
            className="header-btn"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title="Toggle editor theme"
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      {showHistory && (
        <div className="history-bar">
          <div className="history-head">
            <strong>Recent</strong>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setHistory(clearHistory())
                showStatus('ok', 'History cleared')
              }}
            >
              Clear history
            </button>
          </div>
          {history.length === 0 ? (
            <p className="history-empty">No saved entries yet — format or validate to save.</p>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="history-item"
                  onClick={() => {
                    setInput(item.text)
                    setShowHistory(false)
                    showStatus('ok', 'Restored from history')
                  }}
                >
                  {item.preview}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTool === 'json' ? (
      <main className="workspace">
        <EditorPane
          title="Input"
          variant="input"
          tourId="tour-input"
          value={input}
          onChange={setInput}
          theme={theme}
          onClear={() => {
            setInput('')
            setStatus({ type: '', message: '' })
          }}
          onCopy={() => copyText(input)}
          onPaste={pasteToInput}
          onLoadSample={() => {
            setInput(SAMPLE)
            showStatus('ok', 'Sample loaded')
          }}
          onUpload={handleUpload}
          onValidate={handleValidate}
          onSort={() => sortInPlace('input')}
          onBeautifyLocal={() => beautifyInPlace('input')}
          onDownload={() => downloadText(input, 'input.json')}
          onOpenAdvanced={() => setShowAdvanced(true)}
          onNotify={showStatus}
          fileInputRef={fileInputRef}
        />

        <aside className="controls" data-tour="tour-tools">
          <button
            type="button"
            className="action-btn upload-data-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Data
          </button>
          <button type="button" className="action-btn" onClick={pasteToInput}>
            Paste
          </button>
          <button type="button" className="action-btn" onClick={handleValidate}>
            Validate
          </button>

          <label className="field">
            <span>Indentation</span>
            <select
              value={String(indent)}
              onChange={(e) => {
                const v = e.target.value
                setIndent(v === '\t' ? '\t' : Number(v))
              }}
            >
              {INDENT_OPTIONS.map((opt) => (
                <option key={opt.label} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="action-btn primary"
            data-tour="tour-format"
            onClick={handleFormat}
          >
            Format / Beautify
          </button>
          <button type="button" className="action-btn" onClick={handleMinify}>
            Minify / Compact
          </button>
          <button type="button" className="action-btn" onClick={handleDownload}>
            Download
          </button>

          <button
            type="button"
            className={`action-btn advanced-btn ${showAdvanced ? 'is-active' : ''}`}
            onClick={() => setShowAdvanced(true)}
          >
            Advanced features
          </button>

          <p className="shortcuts-hint">Ctrl+Enter format · Ctrl+Shift+M minify</p>

          {status.message && (
            <p className={`status ${status.type}`} role="status">
              {status.message}
            </p>
          )}
        </aside>

        <EditorPane
          title={
            viewMode === 'tree' ? 'Output · Tree' : viewMode === 'diff' ? 'Output · Diff' : 'Output'
          }
          variant="output"
          tourId="tour-output"
          value={output}
          onChange={setOutput}
          theme={theme}
          onCopy={() => copyText(output)}
          onClear={() => {
            setOutput('')
            setDiffRows([])
            setViewMode('code')
          }}
          onValidate={handleValidateOutput}
          onSort={() => sortInPlace('output')}
          onBeautifyLocal={() => beautifyInPlace('output')}
          onDownload={() => downloadText(output, 'output.json')}
          onOpenAdvanced={() => setShowAdvanced(true)}
          onNotify={showStatus}
          mode={viewMode}
          onModeChange={handleModeChange}
          treeData={treeData}
          diffRows={diffRows}
        />
      </main>
      ) : activeTool === 'xml' ? (
        <XmlWorkspace
          theme={theme}
          EditorPane={EditorPane}
          remember={remember}
        />
      ) : activeTool === 'yaml' ? (
        <YamlWorkspace
          theme={theme}
          EditorPane={EditorPane}
          remember={remember}
        />
      ) : activeTool === 'code' ? (
        <CodeWorkspace
          theme={theme}
          EditorPane={EditorPane}
          remember={remember}
        />
      ) : (
        <main className="coming-soon">
          <div className="coming-soon-card">
            <p className="coming-soon-eyebrow">A2Z Formatter</p>
            <h1>
              {TOOLS.find((t) => t.id === activeTool)?.label || 'Tool'} formatter
            </h1>
            <p>This tool is not available yet.</p>
            <button type="button" className="action-btn primary" onClick={() => setActiveTool('json')}>
              Back to JSON
            </button>
          </div>
        </main>
      )}

      <HowToUseModal
        open={showHowTo}
        onClose={() => setShowHowTo(false)}
        onStartTour={startTour}
      />

      {showAdvanced && (
        <div className="modal-backdrop" onClick={() => setShowAdvanced(false)} role="presentation">
          <div
            className="modal-card advanced-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="advanced-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2 id="advanced-title">Advanced features</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAdvanced(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body advanced-body">
              <section className="advanced-section">
                <h3>Transform</h3>
                <div className="advanced-grid">
                  <button type="button" className="action-btn" onClick={() => { handleSortKeys(); setShowAdvanced(false) }}>
                    Sort Keys
                  </button>
                  <button type="button" className="action-btn" onClick={() => { handleRepair(); setShowAdvanced(false) }}>
                    Repair JSON
                  </button>
                  <button type="button" className="action-btn" onClick={() => { handleFlatten(); setShowAdvanced(false) }}>
                    Flatten
                  </button>
                  <button type="button" className="action-btn" onClick={() => { handleUnflatten(); setShowAdvanced(false) }}>
                    Unflatten
                  </button>
                  <button type="button" className="action-btn" onClick={() => { handleEscape(); setShowAdvanced(false) }}>
                    Escape
                  </button>
                  <button type="button" className="action-btn" onClick={() => { handleUnescape(); setShowAdvanced(false) }}>
                    Unescape
                  </button>
                  <button type="button" className="action-btn" onClick={() => { handleBase64('encode'); setShowAdvanced(false) }}>
                    Base64 Encode
                  </button>
                  <button type="button" className="action-btn" onClick={() => { handleBase64('decode'); setShowAdvanced(false) }}>
                    Base64 Decode
                  </button>
                </div>
              </section>

              <section className="advanced-section">
                <h3>Compare & convert</h3>
                <div className="advanced-grid">
                  <button type="button" className="action-btn" onClick={() => { handleDiff(); setShowAdvanced(false) }}>
                    Diff Input vs Output
                  </button>
                </div>
                <div className="convert-row advanced-convert">
                  <select value={convertTo} onChange={(e) => setConvertTo(e.target.value)}>
                    <option value="xml">XML</option>
                    <option value="csv">CSV</option>
                    <option value="yaml">YAML</option>
                    <option value="ts">TypeScript</option>
                  </select>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => {
                      handleConvert()
                      setShowAdvanced(false)
                    }}
                  >
                    Convert
                  </button>
                </div>
              </section>

              <section className="advanced-section">
                <h3>JSON Path</h3>
                <div className="path-row">
                  <input
                    type="text"
                    value={pathQuery}
                    placeholder="meta.tags.0"
                    onChange={(e) => setPathQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePathQuery()
                        setShowAdvanced(false)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => {
                      handlePathQuery()
                      setShowAdvanced(false)
                    }}
                  >
                    Get
                  </button>
                </div>
              </section>

              <section className="advanced-section">
                <h3>View & share</h3>
                <div className="advanced-grid">
                  <button
                    type="button"
                    className={`action-btn ${viewMode === 'code' ? 'is-active' : ''}`}
                    onClick={() => {
                      setViewMode('code')
                      setShowAdvanced(false)
                    }}
                  >
                    Code view
                  </button>
                  <button
                    type="button"
                    className={`action-btn ${viewMode === 'tree' ? 'is-active' : ''}`}
                    onClick={() => {
                      if (!treeData) {
                        showStatus('err', 'Format valid JSON first to use tree view')
                        return
                      }
                      setViewMode('tree')
                      setShowAdvanced(false)
                    }}
                  >
                    Tree view
                  </button>
                  <button type="button" className="action-btn" onClick={() => { swapPanels(); setShowAdvanced(false) }}>
                    Swap panels
                  </button>
                  <button type="button" className="action-btn" onClick={() => { useOutputAsInput(); setShowAdvanced(false) }}>
                    Use output as input
                  </button>
                  <button type="button" className="action-btn" onClick={() => { handleShare(); setShowAdvanced(false) }}>
                    Share link
                  </button>
                </div>
              </section>
            </div>
            <div className="modal-foot">
              <button type="button" className="action-btn" onClick={() => setShowAdvanced(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {tourStep != null && (
        <TourOverlay
          stepIndex={tourStep}
          onNext={nextTour}
          onBack={backTour}
          onClose={closeTour}
        />
      )}
    </div>
  )
}
