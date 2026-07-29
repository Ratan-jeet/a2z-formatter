import { useRef, useState } from 'react'
import { HASH_ALGOS, HASH_SAMPLE, hashText, hashFile } from './hashUtils'

export default function HashWorkspace({ theme, EditorPane, remember }) {
  const [algo, setAlgo] = useState('sha-256')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)
  const hashFileRef = useRef(null)

  const notify = (type, message) => setStatus({ type, message })

  const handleHashText = async () => {
    try {
      const digest = await hashText(input, algo)
      setOutput(digest)
      remember?.(input)
      notify('ok', `${algo.toUpperCase()} hash ready`)
    } catch (err) {
      setOutput(`Error\n\n${err.message}`)
      notify('err', err.message)
    }
  }

  const handleHashFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setProgress(0)
      notify('ok', `Hashing ${file.name}…`)
      const digest = await hashFile(file, algo, setProgress)
      setOutput(`${digest}\n\nfile: ${file.name}\nsize: ${file.size} bytes\nalgo: ${algo}`)
      notify('ok', `${algo.toUpperCase()} file hash ready`)
    } catch (err) {
      setOutput(`Error\n\n${err.message}`)
      notify('err', err.message)
    }
    e.target.value = ''
  }

  return (
    <main className="workspace">
      <EditorPane
        title="Input text"
        variant="input"
        language="text"
        tourId="tour-input"
        value={input}
        onChange={setInput}
        theme={theme}
        acceptFiles="*/*"
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
          setInput(HASH_SAMPLE)
          notify('ok', 'Sample loaded')
        }}
        onUpload={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => {
            setInput(String(reader.result ?? ''))
            notify('ok', `Loaded ${file.name} as text`)
          }
          reader.readAsText(file)
          e.target.value = ''
        }}
        fileInputRef={fileInputRef}
        onNotify={notify}
      />

      <aside className="controls" data-tour="tour-tools">
        <label className="field">
          <span>Algorithm</span>
          <select value={algo} onChange={(e) => setAlgo(e.target.value)}>
            {HASH_ALGOS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="action-btn primary" data-tour="tour-format" onClick={handleHashText}>
          Hash Text
        </button>
        <button type="button" className="action-btn" onClick={() => hashFileRef.current?.click()}>
          Hash File
        </button>
        <input ref={hashFileRef} type="file" hidden onChange={handleHashFile} />

        <button
          type="button"
          className="action-btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(output.split('\n')[0] || '')
              notify('ok', 'Hash copied')
            } catch {
              notify('err', 'Copy failed')
            }
          }}
        >
          Copy Hash
        </button>

        {progress > 0 && progress < 1 && (
          <div className="hash-progress">
            <div style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}

        <p className="shortcuts-hint">MD5 via SparkMD5 · SHA via Web Crypto</p>
        {status.message && <p className={`status ${status.type}`}>{status.message}</p>}
      </aside>

      <EditorPane
        title="Hash output"
        variant="output"
        language="text"
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
        onNotify={notify}
      />
    </main>
  )
}
