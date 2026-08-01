import { useMemo, useState } from 'react'
import { CASE_MODES, convertAllCases, convertCase } from './caseUtils'

const SAMPLE = 'helloWorld_example-TEXT'

export default function CaseWorkspace({ theme }) {
  const [input, setInput] = useState(SAMPLE)
  const [mode, setMode] = useState('camel')
  const [status, setStatus] = useState({ type: 'ok', message: 'Live convert on' })

  const all = useMemo(() => convertAllCases(input), [input])
  const primary = convertCase(input, mode)

  const notify = (type, message) => setStatus({ type, message })

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      notify('ok', 'Copied')
    } catch {
      notify('err', 'Copy failed')
    }
  }

  return (
    <main className={`cron-workspace theme-${theme}`}>
      <div className="cron-card util-card">
        <p className="coming-soon-eyebrow">Case converter</p>
        <h1>Convert text case</h1>
        <p className="cron-lead">camelCase, snake_case, kebab-case, and more — updates as you type.</p>

        <label className="field">
          <span>Input</span>
          <textarea
            className="regex-text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              notify('ok', 'Live convert on')
            }}
            rows={3}
            spellCheck={false}
          />
        </label>

        <div className="cron-actions">
          <button
            type="button"
            className="action-btn"
            onClick={() => {
              setInput(SAMPLE)
              notify('ok', 'Sample loaded')
            }}
          >
            Sample
          </button>
          <button type="button" className="action-btn" onClick={() => copyText(primary)}>
            Copy selected
          </button>
        </div>

        <div className="case-modes">
          {CASE_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`cron-chip ${mode === item.id ? 'is-on' : ''}`}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="cron-result">
          <p className="technique-label">Selected · {CASE_MODES.find((m) => m.id === mode)?.label}</p>
          <pre className="case-output">{primary || ' '}</pre>
        </div>

        <div className="case-grid">
          {CASE_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="case-row"
              onClick={() => copyText(all[item.id])}
              title="Click to copy"
            >
              <span>{item.label}</span>
              <code>{all[item.id] || '—'}</code>
            </button>
          ))}
        </div>

        {status.message && <p className={`status ${status.type}`}>{status.message}</p>}
      </div>
    </main>
  )
}
