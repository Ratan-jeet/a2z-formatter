import { useCallback, useRef, useState } from 'react'
import {
  formatYaml,
  minifyYaml,
  validateYaml,
  yamlToJson,
  jsonTextToYaml,
  YAML_SAMPLE,
  getIndent,
} from './yamlUtils'

export default function YamlWorkspace({
  theme,
  EditorPane,
  remember,
}) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indent, setIndent] = useState(2)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const fileInputRef = useRef(null)

  const notify = useCallback((type, message) => {
    setStatus({ type, message })
  }, [])

  const putError = (err) => {
    const message = err?.message || String(err)
    setOutput(`Error: Invalid YAML\n\n${message}`)
    notify('err', message)
  }

  const handleValidate = () => {
    try {
      const info = validateYaml(input)
      remember?.(input)
      notify('ok', `Valid YAML · type ${info.type} · ${info.bytes} bytes`)
    } catch (err) {
      putError(err)
    }
  }

  const handleFormat = () => {
    try {
      setOutput(formatYaml(input, indent))
      remember?.(input)
      notify('ok', 'YAML formatted successfully')
    } catch (err) {
      putError(err)
    }
  }

  const handleMinify = () => {
    try {
      setOutput(minifyYaml(input))
      remember?.(input)
      notify('ok', 'YAML compacted successfully')
    } catch (err) {
      putError(err)
    }
  }

  const handleToJson = () => {
    try {
      setOutput(yamlToJson(input, getIndent(indent)))
      remember?.(input)
      notify('ok', 'Converted YAML to JSON')
      setShowAdvanced(false)
    } catch (err) {
      putError(err)
      setShowAdvanced(false)
    }
  }

  const handleJsonToYaml = () => {
    try {
      setOutput(jsonTextToYaml(input, indent))
      remember?.(input)
      notify('ok', 'Converted JSON to YAML')
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
          language="yaml"
          tourId="tour-input"
          value={input}
          onChange={setInput}
          theme={theme}
          acceptFiles=".yaml,.yml,text/yaml,text/plain,.txt,.json"
          onClear={() => {
            setInput('')
            setStatus({ type: '', message: '' })
          }}
          onCopy={() => copyText(input)}
          onPaste={pasteToInput}
          onLoadSample={() => {
            setInput(YAML_SAMPLE)
            notify('ok', 'Sample YAML loaded')
          }}
          onUpload={handleUpload}
          onValidate={handleValidate}
          onDownload={() => downloadText(input, 'input.yaml')}
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
              onChange={(e) => setIndent(Number(e.target.value))}
            >
              <option value="2">2 Spaces</option>
              <option value="3">3 Spaces</option>
              <option value="4">4 Spaces</option>
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
            onClick={() => downloadText(output || input, 'data.yaml')}
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

          <p className="shortcuts-hint">Format pretty-prints · Compact densifies YAML</p>

          {status.message && (
            <p className={`status ${status.type}`} role="status">
              {status.message}
            </p>
          )}
        </aside>

        <EditorPane
          title="Output"
          variant="output"
          language="yaml"
          tourId="tour-output"
          value={output}
          onChange={setOutput}
          theme={theme}
          onCopy={() => copyText(output)}
          onClear={() => setOutput('')}
          onValidate={() => {
            try {
              validateYaml(output)
              notify('ok', 'Output is valid YAML')
            } catch (err) {
              notify('err', `Output: ${err.message}`)
            }
          }}
          onDownload={() => downloadText(output, 'output.yaml')}
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
            aria-labelledby="yaml-advanced-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2 id="yaml-advanced-title">YAML advanced</h2>
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
                    YAML → JSON
                  </button>
                  <button type="button" className="action-btn" onClick={handleJsonToYaml}>
                    JSON → YAML
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
