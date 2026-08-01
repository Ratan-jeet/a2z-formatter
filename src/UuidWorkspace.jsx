import { useState } from 'react'
import { generateMany, generateUlid, generateUuidV4, isUlid, isUuid } from './uuidUtils'

export default function UuidWorkspace({ theme }) {
  const [kind, setKind] = useState('uuid')
  const [count, setCount] = useState(5)
  const [output, setOutput] = useState(() => generateUuidV4())
  const [check, setCheck] = useState('')
  const [status, setStatus] = useState({ type: 'ok', message: 'Ready' })

  const notify = (type, message) => setStatus({ type, message })

  const handleGenerate = () => {
    const rows = generateMany(kind, count)
    setOutput(rows.join('\n'))
    notify('ok', `Generated ${rows.length} ${kind.toUpperCase()}${rows.length > 1 ? 's' : ''}`)
  }

  const handleOne = () => {
    const value = kind === 'ulid' ? generateUlid() : generateUuidV4()
    setOutput(value)
    notify('ok', `${kind.toUpperCase()} ready`)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output)
      notify('ok', 'Copied')
    } catch {
      notify('err', 'Copy failed')
    }
  }

  const handleValidate = () => {
    const value = check.trim()
    if (!value) {
      notify('err', 'Paste a UUID or ULID to check')
      return
    }
    if (isUuid(value)) notify('ok', 'Valid UUID')
    else if (isUlid(value)) notify('ok', 'Valid ULID')
    else notify('err', 'Not a valid UUID or ULID')
  }

  return (
    <main className={`cron-workspace theme-${theme}`}>
      <div className="cron-card util-card">
        <p className="coming-soon-eyebrow">UUID / ULID</p>
        <h1>Generate identifiers</h1>
        <p className="cron-lead">Create UUID v4 or ULID values locally in your browser. Nothing is sent to a server.</p>

        <div className="cron-actions">
          <button
            type="button"
            className={`cron-chip ${kind === 'uuid' ? 'is-on' : ''}`}
            onClick={() => setKind('uuid')}
          >
            UUID v4
          </button>
          <button
            type="button"
            className={`cron-chip ${kind === 'ulid' ? 'is-on' : ''}`}
            onClick={() => setKind('ulid')}
          >
            ULID
          </button>
        </div>

        <label className="field">
          <span>How many</span>
          <input
            className="cron-input"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>

        <div className="cron-actions">
          <button type="button" className="action-btn primary" onClick={handleGenerate}>
            Generate
          </button>
          <button type="button" className="action-btn" onClick={handleOne}>
            One more
          </button>
          <button type="button" className="action-btn" onClick={handleCopy}>
            Copy
          </button>
        </div>

        <label className="field">
          <span>Output</span>
          <textarea className="regex-text" value={output} onChange={(e) => setOutput(e.target.value)} rows={4} />
        </label>

        <label className="field">
          <span>Validate UUID / ULID</span>
          <input
            className="cron-input"
            value={check}
            onChange={(e) => setCheck(e.target.value)}
            placeholder="Paste an id to check"
            spellCheck={false}
          />
        </label>
        <div className="cron-actions">
          <button type="button" className="action-btn" onClick={handleValidate}>
            Validate
          </button>
        </div>

        {status.message && <p className={`status ${status.type}`}>{status.message}</p>}
      </div>
    </main>
  )
}
