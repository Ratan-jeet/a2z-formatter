import { useCallback, useRef, useState } from 'react'
import {
  formatXml,
  minifyXml,
  validateXml,
  xmlToJson,
  XML_SAMPLE,
  getIndent,
} from './xmlUtils'

export default function XmlWorkspace({
  theme,
  EditorPane,
  showStatus,
  remember,
}) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indent, setIndent] = useState(2)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const fileInputRef = useRef(null)

  const notify = useCallback(
    (type, message) => {
      setStatus({ type, message })
      showStatus?.(type, message)
    },
    [showStatus],
  )

  const putError = (err) => {
    const message = err?.message || String(err)
    setOutput(`Error: Invalid XML\n\n${message}`)
    notify('err', message)
  }

  const handleValidate = () => {
    try {
      const info = validateXml(input)
      remember?.(input)
      notify('ok', `Valid XML · ${info.elements} elements · ${info.bytes} bytes`)
    } catch (err) {
      putError(err)
    }
  }

  const handleFormat = () => {
    try {
      const formatted = formatXml(input, getIndent(indent))
      setOutput(formatted)
      remember?.(input)
      notify('ok', 'XML formatted successfully')
    } catch (err) {
      putError(err)
    }
  }

  const handleMinify = () => {
    try {
      const minified = minifyXml(input)
      setOutput(minified)
      remember?.(input)
      notify('ok', 'XML minified successfully')
    } catch (err) {
      putError(err)
    }
  }

  const handleToJson = () => {
    try {
      const json = xmlToJson(input)
      setOutput(JSON.stringify(json, null, getIndent(indent)))
      remember?.(input)
      notify('ok', 'Converted XML to JSON')
      setShowAdvanced(false)
    } catch (err) {
      putError(err)
      setShowAdvanced(false)
    }
  }

  const downloadText = (content, name) => {
    if (!content.trim()) {
      notify('err', 'Nothing to download')
      return
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    notify('ok', `Downloaded ${name}`)
  }

  const copyText = async (text) => {
    if (!text) {
      notify('err', 'Nothing to copy')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      notify('ok', 'Copied to clipboard')
    } catch {
      notify('err', 'Copy failed')
    }
  }

  const pasteToInput = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setInput(text)
      notify('ok', 'Pasted from clipboard')
    } catch {
      notify('err', 'Clipboard paste blocked — use Ctrl+V')
    }
  }

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setInput(String(reader.result ?? ''))
      notify('ok', `Loaded ${file.name}`)
    }
    reader.onerror = () => notify('err', 'Failed to read file')
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <>
      <main className="workspace">
        <EditorPane
          title="Input"
          variant="input"
          language="xml"
          tourId="tour-input"
          value={input}
          onChange={setInput}
          theme={theme}
          acceptFiles=".xml,text/xml,application/xml,text/plain,.txt"
          onClear={() => {
            setInput('')
            setStatus({ type: '', message: '' })
          }}
          onCopy={() => copyText(input)}
          onPaste={pasteToInput}
          onLoadSample={() => {
            setInput(XML_SAMPLE)
            notify('ok', 'Sample XML loaded')
          }}
          onUpload={handleUpload}
          onValidate={handleValidate}
          onDownload={() => downloadText(input, 'input.xml')}
          onOpenAdvanced={() => setShowAdvanced(true)}
          onNotify={notify}
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
              <option value="2">2 Spaces</option>
              <option value="3">3 Spaces</option>
              <option value="4">4 Spaces</option>
              <option value={'\t'}>Tab</option>
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
          <button
            type="button"
            className="action-btn"
            onClick={() => downloadText(output || input, 'data.xml')}
          >
            Download
          </button>

          <button
            type="button"
            className={`action-btn advanced-btn ${showAdvanced ? 'is-active' : ''}`}
            onClick={() => setShowAdvanced(true)}
          >
            Advanced features
          </button>

          <p className="shortcuts-hint">Format pretty-prints · Minify removes extra spaces</p>

          {status.message && (
            <p className={`status ${status.type}`} role="status">
              {status.message}
            </p>
          )}
        </aside>

        <EditorPane
          title="Output"
          variant="output"
          language="xml"
          tourId="tour-output"
          value={output}
          onChange={setOutput}
          theme={theme}
          onCopy={() => copyText(output)}
          onClear={() => setOutput('')}
          onValidate={() => {
            try {
              validateXml(output)
              notify('ok', 'Output is valid XML')
            } catch (err) {
              notify('err', `Output: ${err.message}`)
            }
          }}
          onDownload={() => downloadText(output, 'output.xml')}
          onOpenAdvanced={() => setShowAdvanced(true)}
          onNotify={notify}
        />
      </main>

      {showAdvanced && (
        <div className="modal-backdrop" onClick={() => setShowAdvanced(false)} role="presentation">
          <div
            className="modal-card advanced-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="xml-advanced-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2 id="xml-advanced-title">XML advanced</h2>
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
                <h3>Convert</h3>
                <div className="advanced-grid">
                  <button type="button" className="action-btn" onClick={handleToJson}>
                    XML → JSON
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
    </>
  )
}
