import { useMemo, useRef, useState } from 'react'
import { diffLines } from 'diff'

const SAMPLE_A = `{
  "name": "A2Z Formatter",
  "version": 1,
  "features": ["json", "xml"]
}`

const SAMPLE_B = `{
  "name": "A2Z Formatter",
  "version": 2,
  "features": ["json", "xml", "yaml", "diff"],
  "active": true
}`

function buildDiffRows(left, right, { ignoreWhitespace }) {
  const a = ignoreWhitespace ? left.replace(/[ \t]+/g, ' ') : left
  const b = ignoreWhitespace ? right.replace(/[ \t]+/g, ' ') : right
  const parts = diffLines(a, b)
  const rows = []
  let lineA = 1
  let lineB = 1

  for (const part of parts) {
    const lines = part.value.replace(/\n$/, '').split('\n')
    // diffLines keeps trailing newline semantics; empty last from split on pure newline chunks
    const useful = part.value === '' ? [] : lines

    for (let i = 0; i < useful.length; i += 1) {
      // Skip phantom empty line created by trailing newline on chunk end
      if (i === useful.length - 1 && useful[i] === '' && part.value.endsWith('\n')) {
        continue
      }
      const text = useful[i]
      if (part.added) {
        rows.push({ type: 'added', text, lineA: null, lineB: lineB++ })
      } else if (part.removed) {
        rows.push({ type: 'removed', text, lineA: lineA++, lineB: null })
      } else {
        rows.push({ type: 'same', text, lineA: lineA++, lineB: lineB++ })
      }
    }
  }
  return rows
}

export default function DiffWorkspace({ theme, EditorPane, remember }) {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [rows, setRows] = useState(null)
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const leftFileRef = useRef(null)
  const rightFileRef = useRef(null)

  const stats = useMemo(() => {
    if (!rows) return null
    return {
      added: rows.filter((r) => r.type === 'added').length,
      removed: rows.filter((r) => r.type === 'removed').length,
      same: rows.filter((r) => r.type === 'same').length,
    }
  }, [rows])

  const notify = (type, message) => setStatus({ type, message })

  const handleCompare = () => {
    if (!left.trim() && !right.trim()) {
      notify('err', 'Paste or load two texts/files to compare')
      setRows(null)
      return
    }
    const next = buildDiffRows(left, right, { ignoreWhitespace })
    setRows(next)
    remember?.(left)
    const added = next.filter((r) => r.type === 'added').length
    const removed = next.filter((r) => r.type === 'removed').length
    if (added === 0 && removed === 0) notify('ok', 'Files are identical')
    else notify('ok', `${added} added · ${removed} removed line(s)`)
  }

  const handleSwap = () => {
    setLeft(right)
    setRight(left)
    setRows(null)
    notify('ok', 'Swapped left ↔ right')
  }

  const loadFile = (side) => (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      if (side === 'left') setLeft(text)
      else setRight(text)
      setRows(null)
      notify('ok', `Loaded ${file.name} into ${side === 'left' ? 'A' : 'B'}`)
    }
    reader.onerror = () => notify('err', 'Failed to read file')
    reader.readAsText(file)
    e.target.value = ''
  }

  const copyDiff = async () => {
    if (!rows) {
      notify('err', 'Compare first')
      return
    }
    const text = rows
      .map((r) => {
        const prefix = r.type === 'added' ? '+' : r.type === 'removed' ? '-' : ' '
        return `${prefix} ${r.text}`
      })
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      notify('ok', 'Diff copied')
    } catch {
      notify('err', 'Copy failed')
    }
  }

  return (
    <div className="diff-tool">
      <main className="workspace diff-workspace">
        <EditorPane
          title="File A"
          variant="input"
          language="text"
          value={left}
          onChange={(v) => {
            setLeft(v)
            setRows(null)
          }}
          theme={theme}
          acceptFiles="*/*"
          onClear={() => {
            setLeft('')
            setRows(null)
          }}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(left)
              notify('ok', 'Copied File A')
            } catch {
              notify('err', 'Copy failed')
            }
          }}
          onPaste={async () => {
            try {
              setLeft(await navigator.clipboard.readText())
              setRows(null)
              notify('ok', 'Pasted into File A')
            } catch {
              notify('err', 'Clipboard paste blocked')
            }
          }}
          onLoadSample={() => {
            setLeft(SAMPLE_A)
            setRight(SAMPLE_B)
            setRows(null)
            notify('ok', 'Sample pair loaded')
          }}
          onUpload={loadFile('left')}
          fileInputRef={leftFileRef}
          onNotify={notify}
        />

        <aside className="controls" data-tour="tour-tools">
          <button type="button" className="action-btn upload-data-btn" onClick={() => leftFileRef.current?.click()}>
            Load File A
          </button>
          <button type="button" className="action-btn" onClick={() => rightFileRef.current?.click()}>
            Load File B
          </button>

          <label className="check-field">
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={(e) => {
                setIgnoreWhitespace(e.target.checked)
                setRows(null)
              }}
            />
            <span>Ignore extra spaces</span>
          </label>

          <button type="button" className="action-btn primary" data-tour="tour-format" onClick={handleCompare}>
            Compare
          </button>
          <button type="button" className="action-btn" onClick={handleSwap}>
            Swap A ↔ B
          </button>
          <button type="button" className="action-btn" onClick={copyDiff}>
            Copy Diff
          </button>
          <button
            type="button"
            className="action-btn"
            onClick={() => {
              setLeft('')
              setRight('')
              setRows(null)
              setStatus({ type: '', message: '' })
            }}
          >
            Clear All
          </button>

          <p className="shortcuts-hint">Line diff for any text or code files</p>

          {status.message && (
            <p className={`status ${status.type}`} role="status">
              {status.message}
            </p>
          )}
          {stats && (
            <div className="diff-stats">
              <span className="diff-stat added">+{stats.added}</span>
              <span className="diff-stat removed">-{stats.removed}</span>
              <span className="diff-stat same">{stats.same} same</span>
            </div>
          )}
        </aside>

        <EditorPane
          title="File B"
          variant="output"
          language="text"
          value={right}
          onChange={(v) => {
            setRight(v)
            setRows(null)
          }}
          theme={theme}
          acceptFiles="*/*"
          onClear={() => {
            setRight('')
            setRows(null)
          }}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(right)
              notify('ok', 'Copied File B')
            } catch {
              notify('err', 'Copy failed')
            }
          }}
          onPaste={async () => {
            try {
              setRight(await navigator.clipboard.readText())
              setRows(null)
              notify('ok', 'Pasted into File B')
            } catch {
              notify('err', 'Clipboard paste blocked')
            }
          }}
          onUpload={loadFile('right')}
          fileInputRef={rightFileRef}
          onNotify={notify}
        />
      </main>

      <section className={`diff-results theme-${theme}`} aria-label="Diff results">
        <div className="diff-results-head">
          <strong>Diff result</strong>
          <span>{rows ? `${rows.length} lines` : 'Run Compare to see changes'}</span>
        </div>
        <div className="diff-results-body">
          {!rows ? (
            <p className="diff-empty">Load or paste File A and File B, then click Compare.</p>
          ) : rows.length === 0 ? (
            <p className="diff-empty">No content</p>
          ) : (
            rows.map((row, i) => (
              <div key={`${row.type}-${i}-${row.lineA}-${row.lineB}`} className={`diff-line diff-${row.type}`}>
                <span className="diff-gutter">{row.lineA ?? ''}</span>
                <span className="diff-gutter">{row.lineB ?? ''}</span>
                <span className="diff-sign">
                  {row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ' '}
                </span>
                <span className="diff-text">{row.text || ' '}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
