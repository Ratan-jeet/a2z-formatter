import { useMemo, useState } from 'react'
import {
  REGEX_SAMPLE_TEXT,
  REGEX_SAMPLE_PATTERN,
  runRegex,
  buildHighlightedHtml,
} from './regexUtils'

const FLAG_OPTIONS = [
  { id: 'g', label: 'g global' },
  { id: 'i', label: 'i ignore case' },
  { id: 'm', label: 'm multiline' },
  { id: 's', label: 's dotAll' },
  { id: 'u', label: 'u unicode' },
]

export default function RegexWorkspace({ theme }) {
  const [pattern, setPattern] = useState(REGEX_SAMPLE_PATTERN)
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState(REGEX_SAMPLE_TEXT)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState({ type: '', message: '' })

  const notify = (type, message) => setStatus({ type, message })

  const highlighted = useMemo(() => {
    if (!result?.matches) return null
    return buildHighlightedHtml(text, result.matches)
  }, [result, text])

  const toggleFlag = (id) => {
    setFlags((prev) => (prev.includes(id) ? prev.replace(id, '') : `${prev}${id}`))
    setResult(null)
  }

  const handleTest = () => {
    try {
      const next = runRegex(pattern, flags, text)
      setResult(next)
      notify('ok', `${next.matches.length} match(es)`)
    } catch (err) {
      setResult(null)
      notify('err', err.message || 'Invalid regex')
    }
  }

  return (
    <main className={`regex-workspace theme-${theme}`}>
      <div className="regex-card">
        <p className="coming-soon-eyebrow">Regex tester</p>
        <h1>Test a regular expression</h1>

        <label className="field">
          <span>Pattern</span>
          <input
            className="cron-input"
            value={pattern}
            onChange={(e) => {
              setPattern(e.target.value)
              setResult(null)
            }}
            spellCheck={false}
            placeholder="e.g. \\d+"
          />
        </label>

        <div className="regex-flags">
          {FLAG_OPTIONS.map((flag) => (
            <label key={flag.id} className={`regex-flag ${flags.includes(flag.id) ? 'is-on' : ''}`}>
              <input
                type="checkbox"
                checked={flags.includes(flag.id)}
                onChange={() => toggleFlag(flag.id)}
              />
              {flag.label}
            </label>
          ))}
        </div>

        <label className="field">
          <span>Test text</span>
          <textarea
            className="regex-text"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setResult(null)
            }}
            spellCheck={false}
            rows={8}
          />
        </label>

        <div className="cron-actions">
          <button type="button" className="action-btn primary" onClick={handleTest}>
            Test
          </button>
          <button
            type="button"
            className="action-btn"
            onClick={() => {
              setPattern(REGEX_SAMPLE_PATTERN)
              setText(REGEX_SAMPLE_TEXT)
              setFlags('g')
              setResult(null)
              notify('ok', 'Sample loaded')
            }}
          >
            Sample
          </button>
        </div>

        {status.message && <p className={`status ${status.type}`}>{status.message}</p>}

        {highlighted != null && (
          <div className="regex-preview">
            <p className="technique-label">Highlights</p>
            <pre dangerouslySetInnerHTML={{ __html: highlighted || ' ' }} />
          </div>
        )}

        {result && (
          <div className="regex-matches">
            <p className="technique-label">Matches ({result.matches.length})</p>
            {result.matches.length === 0 ? (
              <p className="history-empty">No matches</p>
            ) : (
              <ul>
                {result.matches.map((match, i) => (
                  <li key={`${match.index}-${i}`}>
                    <code>{match.value}</code>
                    <span>@ {match.index}</span>
                    {match.groups?.length > 0 && (
                      <span className="regex-groups">groups: {match.groups.join(' · ')}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
