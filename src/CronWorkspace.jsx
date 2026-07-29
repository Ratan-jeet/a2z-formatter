import { useState } from 'react'
import { CRON_SAMPLES, explainCron } from './cronUtils'

export default function CronWorkspace({ theme }) {
  const [expression, setExpression] = useState('0 9 * * 1-5')
  const [use24Hour, setUse24Hour] = useState(true)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState({ type: '', message: '' })

  const notify = (type, message) => setStatus({ type, message })

  const handleExplain = () => {
    try {
      const next = explainCron(expression, { use24Hour })
      setResult(next)
      notify('ok', 'Cron explained')
    } catch (err) {
      setResult(null)
      notify('err', err.message || 'Invalid cron')
    }
  }

  return (
    <main className={`cron-workspace theme-${theme}`}>
      <div className="cron-card">
        <p className="coming-soon-eyebrow">Cron parser</p>
        <h1>Explain a cron expression</h1>
        <p className="cron-lead">Enter a standard 5- or 6-field cron schedule and get a plain-English description.</p>

        <label className="field">
          <span>Cron expression</span>
          <input
            className="cron-input"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExplain()}
            placeholder="*/15 * * * *"
            spellCheck={false}
          />
        </label>

        <label className="check-field">
          <input type="checkbox" checked={use24Hour} onChange={(e) => setUse24Hour(e.target.checked)} />
          <span>24-hour time format</span>
        </label>

        <div className="cron-actions">
          <button type="button" className="action-btn primary" onClick={handleExplain}>
            Explain
          </button>
          <button
            type="button"
            className="action-btn"
            onClick={() => {
              const pick = CRON_SAMPLES[Math.floor(Math.random() * CRON_SAMPLES.length)]
              setExpression(pick)
              setResult(null)
              notify('ok', 'Sample loaded')
            }}
          >
            Sample
          </button>
        </div>

        <div className="cron-samples">
          {CRON_SAMPLES.map((sample) => (
            <button
              key={sample}
              type="button"
              className="cron-chip"
              onClick={() => {
                setExpression(sample)
                setResult(null)
              }}
            >
              {sample}
            </button>
          ))}
        </div>

        {status.message && <p className={`status ${status.type}`}>{status.message}</p>}

        {result && (
          <div className="cron-result">
            <p className="technique-label">Meaning</p>
            <p className="cron-description">{result.description}</p>
            {result.fields && (
              <div className="cron-fields">
                {Object.entries(result.fields).map(([key, value]) => (
                  <div key={key} className="cron-field">
                    <span>{key}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
