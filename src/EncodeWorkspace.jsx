import { useCallback, useRef, useState } from 'react'
import {
  ENCODE_MODES,
  ENCODE_SAMPLES,
  encodeText,
  decodeText,
  modeSupportsEncode,
} from './encodeUtils'

export default function EncodeWorkspace({ theme, EditorPane, remember }) {
  const [mode, setMode] = useState('base64')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
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

  const handleEncode = () => {
    try {
      if (!modeSupportsEncode(mode)) throw new Error('JWT is decode-only')
      setOutput(encodeText(input, mode))
      remember?.(input)
      notify('ok', `${ENCODE_MODES.find((m) => m.id === mode)?.label} encoded`)
    } catch (err) {
      putError(err)
    }
  }

  const handleDecode = () => {
    try {
      setOutput(decodeText(input, mode))
      remember?.(input)
      notify('ok', `${ENCODE_MODES.find((m) => m.id === mode)?.label} decoded`)
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
      setInput(await navigator.clipboard.readText())
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
    <main className="workspace">
      <EditorPane
        title="Input"
        variant="input"
        language="text"
        tourId="tour-input"
        value={input}
        onChange={setInput}
        theme={theme}
        acceptFiles="*/*"
        onClear={() => {
          setInput('')
          setStatus({ type: '', message: '' })
        }}
        onCopy={() => copyText(input)}
        onPaste={pasteToInput}
        onLoadSample={() => {
          setInput(ENCODE_SAMPLES[mode] || '')
          notify('ok', 'Sample loaded')
        }}
        onUpload={handleUpload}
        onDownload={() => downloadText(input, 'input.txt')}
        onNotify={notify}
        fileInputRef={fileInputRef}
      />

      <aside className="controls" data-tour="tour-tools">
        <label className="field">
          <span>Mode</span>
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value)
              setOutput('')
              setStatus({ type: '', message: '' })
            }}
          >
            {ENCODE_MODES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {(() => {
          const current = ENCODE_MODES.find((m) => m.id === mode)
          if (!current) return null
          return (
            <div className="technique-card">
              <p className="technique-label">Technique</p>
              <p className="technique-name">{current.technique}</p>
              <p className="technique-detail">{current.detail}</p>
            </div>
          )
        })()}

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

        <button
          type="button"
          className="action-btn primary"
          data-tour="tour-format"
          onClick={handleEncode}
          disabled={!modeSupportsEncode(mode)}
        >
          Encode
        </button>
        <button type="button" className="action-btn" onClick={handleDecode}>
          Decode
        </button>

        <button
          type="button"
          className="action-btn"
          onClick={() => {
            setInput(output)
            setOutput('')
            notify('ok', 'Output moved to input')
          }}
        >
          Use Output
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={() => downloadText(output || input, 'encoded.txt')}
        >
          Download
        </button>

        <p className="shortcuts-hint">
          {mode === 'jwt' ? 'JWT Encode is disabled — decode only' : 'Pick a mode, then Encode or Decode'}
        </p>

        {status.message && (
          <p className={`status ${status.type}`} role="status">
            {status.message}
          </p>
        )}
      </aside>

      <EditorPane
        title="Output"
        variant="output"
        language={mode === 'jwt' ? 'json' : 'text'}
        tourId="tour-output"
        value={output}
        onChange={setOutput}
        theme={theme}
        onCopy={() => copyText(output)}
        onClear={() => setOutput('')}
        onDownload={() => downloadText(output, 'output.txt')}
        onNotify={notify}
      />
    </main>
  )
}
