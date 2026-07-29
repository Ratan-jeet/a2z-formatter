import { useRef, useState } from 'react'
import { SQL_SAMPLE, formatSql, minifySql } from './sqlUtils'

export default function SqlWorkspace({ theme, EditorPane, remember }) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indent, setIndent] = useState(2)
  const [status, setStatus] = useState({ type: '', message: '' })
  const fileInputRef = useRef(null)

  const notify = (type, message) => setStatus({ type, message })
  const putError = (err) => {
    const message = err?.message || String(err)
    setOutput(`Error\n\n${message}`)
    notify('err', message)
  }

  const handleFormat = () => {
    try {
      setOutput(formatSql(input, indent))
      remember?.(input)
      notify('ok', 'SQL formatted')
    } catch (err) {
      putError(err)
    }
  }

  const handleMinify = () => {
    try {
      setOutput(minifySql(input))
      remember?.(input)
      notify('ok', 'SQL compacted')
    } catch (err) {
      putError(err)
    }
  }

  const download = (content, name) => {
    if (!content.trim()) return notify('err', 'Nothing to download')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    notify('ok', `Downloaded ${name}`)
  }

  return (
    <main className="workspace">
      <EditorPane
        title="Input"
        variant="input"
        language="sql"
        tourId="tour-input"
        value={input}
        onChange={setInput}
        theme={theme}
        acceptFiles=".sql,text/plain,.txt"
        onClear={() => setInput('')}
        onCopy={async () => {
          try {
            await navigator.clipboard.writeText(input)
            notify('ok', 'Copied')
          } catch {
            notify('err', 'Copy failed')
          }
        }}
        onPaste={async () => {
          try {
            setInput(await navigator.clipboard.readText())
            notify('ok', 'Pasted')
          } catch {
            notify('err', 'Clipboard blocked')
          }
        }}
        onLoadSample={() => {
          setInput(SQL_SAMPLE)
          notify('ok', 'Sample SQL loaded')
        }}
        onUpload={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => {
            setInput(String(reader.result ?? ''))
            notify('ok', `Loaded ${file.name}`)
          }
          reader.readAsText(file)
          e.target.value = ''
        }}
        onDownload={() => download(input, 'input.sql')}
        fileInputRef={fileInputRef}
        onNotify={notify}
      />

      <aside className="controls" data-tour="tour-tools">
        <button type="button" className="action-btn upload-data-btn" onClick={() => fileInputRef.current?.click()}>
          Upload
        </button>
        <label className="field">
          <span>Indentation</span>
          <select value={String(indent)} onChange={(e) => setIndent(Number(e.target.value))}>
            <option value="2">2 Spaces</option>
            <option value="4">4 Spaces</option>
          </select>
        </label>
        <button type="button" className="action-btn primary" data-tour="tour-format" onClick={handleFormat}>
          Format / Beautify
        </button>
        <button type="button" className="action-btn" onClick={handleMinify}>
          Minify / Compact
        </button>
        <button type="button" className="action-btn" onClick={() => download(output || input, 'query.sql')}>
          Download
        </button>
        <p className="shortcuts-hint">Pretty-prints SQL keywords and clauses</p>
        {status.message && <p className={`status ${status.type}`}>{status.message}</p>}
      </aside>

      <EditorPane
        title="Output"
        variant="output"
        language="sql"
        tourId="tour-output"
        value={output}
        onChange={setOutput}
        theme={theme}
        onClear={() => setOutput('')}
        onCopy={async () => {
          try {
            await navigator.clipboard.writeText(output)
            notify('ok', 'Copied')
          } catch {
            notify('err', 'Copy failed')
          }
        }}
        onDownload={() => download(output, 'output.sql')}
        onNotify={notify}
      />
    </main>
  )
}
