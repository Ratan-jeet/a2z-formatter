import { useCallback, useRef, useState } from 'react'
import {
  CODE_MODES,
  CODE_SAMPLES,
  formatCode,
  minifyCode,
  validateCode,
  modeAccept,
  modeExt,
} from './codeUtils'

export default function CodeWorkspace({ theme, EditorPane, remember }) {
  const [mode, setMode] = useState('js')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indent, setIndent] = useState(2)
  const [status, setStatus] = useState({ type: '', message: '' })
  const fileInputRef = useRef(null)

  const notify = useCallback((type, message) => {
    setStatus({ type, message })
  }, [])

  const putError = (err) => {
    const message = err?.message || String(err)
    setOutput(`Error\n\n${message}`)
    notify('err', message)
  }

  const language = mode === 'js' ? 'javascript' : mode

  const handleValidate = () => {
    try {
      const info = validateCode(input, mode)
      remember?.(input)
      notify('ok', `Valid ${info.kind} · ${info.bytes} bytes`)
    } catch (err) {
      putError(err)
    }
  }

  const handleFormat = () => {
    try {
      setOutput(formatCode(input, mode, indent))
      remember?.(input)
      notify('ok', `${CODE_MODES.find((m) => m.id === mode)?.label} formatted`)
    } catch (err) {
      putError(err)
    }
  }

  const handleMinify = async () => {
    try {
      const result = await minifyCode(input, mode)
      setOutput(result)
      remember?.(input)
      notify('ok', `${CODE_MODES.find((m) => m.id === mode)?.label} minified`)
    } catch (err) {
      putError(err)
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
      const name = file.name.toLowerCase()
      if (name.endsWith('.css')) setMode('css')
      else if (name.endsWith('.html') || name.endsWith('.htm')) setMode('html')
      else if (name.endsWith('.js') || name.endsWith('.mjs') || name.endsWith('.cjs') || name.endsWith('.ts')) {
        setMode('js')
      }
      notify('ok', `Loaded ${file.name}`)
    }
    reader.onerror = () => notify('err', 'Failed to read file')
    reader.readAsText(file)
    e.target.value = ''
  }

  const switchMode = (next) => {
    setMode(next)
    setOutput('')
    setStatus({ type: '', message: '' })
  }

  return (
    <main className="workspace">
      <EditorPane
        title="Input"
        variant="input"
        language={language}
        tourId="tour-input"
        value={input}
        onChange={setInput}
        theme={theme}
        acceptFiles={modeAccept(mode)}
        onClear={() => {
          setInput('')
          setStatus({ type: '', message: '' })
        }}
        onCopy={() => copyText(input)}
        onPaste={pasteToInput}
        onLoadSample={() => {
          setInput(CODE_SAMPLES[mode])
          notify('ok', `Sample ${mode.toUpperCase()} loaded`)
        }}
        onUpload={handleUpload}
        onValidate={handleValidate}
        onDownload={() => downloadText(input, `input.${modeExt(mode)}`)}
        onNotify={notify}
        fileInputRef={fileInputRef}
      />

      <aside className="controls" data-tour="tour-tools">
        <label className="field">
          <span>Language</span>
          <select value={mode} onChange={(e) => switchMode(e.target.value)}>
            {CODE_MODES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

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
          <select value={String(indent)} onChange={(e) => setIndent(Number(e.target.value))}>
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
          onClick={() => downloadText(output || input, `data.${modeExt(mode)}`)}
        >
          Download
        </button>

        <p className="shortcuts-hint">Pick JS, HTML, or CSS · then Format or Minify</p>

        {status.message && (
          <p className={`status ${status.type}`} role="status">
            {status.message}
          </p>
        )}
      </aside>

      <EditorPane
        title="Output"
        variant="output"
        language={language}
        tourId="tour-output"
        value={output}
        onChange={setOutput}
        theme={theme}
        onCopy={() => copyText(output)}
        onClear={() => setOutput('')}
        onValidate={() => {
          try {
            const info = validateCode(output, mode)
            notify('ok', `Output is valid ${info.kind}`)
          } catch (err) {
            notify('err', `Output: ${err.message}`)
          }
        }}
        onDownload={() => downloadText(output, `output.${modeExt(mode)}`)}
        onNotify={notify}
      />
    </main>
  )
}
