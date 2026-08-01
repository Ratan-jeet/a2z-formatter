import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_TIMEZONE,
  TIMEZONES,
  calcDuration,
  calcEta,
  dateToUnix,
  formatInZone,
  formatStopwatch,
  nowInZone,
  nowUnix,
  relativeFrom,
  unixToDate,
} from './timestampUtils'

const TABS = [
  { id: 'convert', label: 'Convert' },
  { id: 'relative', label: 'Relative' },
  { id: 'duration', label: 'Duration' },
  { id: 'stopwatch', label: 'Stopwatch' },
]

function zoneNowPlus(timeZone, offsetMs) {
  return formatInZone(new Date(Date.now() + offsetMs), timeZone).isoLike
}

export default function TimestampWorkspace({ theme }) {
  const [tab, setTab] = useState('convert')
  const [timeZone, setTimeZone] = useState(DEFAULT_TIMEZONE)
  const [unit, setUnit] = useState('seconds')
  const [unixInput, setUnixInput] = useState(() => String(nowUnix('seconds')))
  const [dateInput, setDateInput] = useState(() => nowInZone(DEFAULT_TIMEZONE).isoLike)
  const [fromUnix, setFromUnix] = useState(null)
  const [fromDate, setFromDate] = useState(null)
  const [live, setLive] = useState(() => ({
    seconds: nowUnix('seconds'),
    ms: nowUnix('milliseconds'),
    zoned: nowInZone(DEFAULT_TIMEZONE),
  }))
  const [status, setStatus] = useState({ type: '', message: '' })

  const [relativeInput, setRelativeInput] = useState(() => String(nowUnix('seconds') - 7200))
  const [relativeResult, setRelativeResult] = useState(null)

  const [durStart, setDurStart] = useState(() => zoneNowPlus(DEFAULT_TIMEZONE, -30 * 60 * 1000))
  const [durEnd, setDurEnd] = useState(() => zoneNowPlus(DEFAULT_TIMEZONE, 60 * 60 * 1000))
  const [durResult, setDurResult] = useState(null)
  const [etaStart, setEtaStart] = useState(() => zoneNowPlus(DEFAULT_TIMEZONE, -30 * 60 * 1000))
  const [etaDone, setEtaDone] = useState('40')
  const [etaTotal, setEtaTotal] = useState('100')
  const [etaResult, setEtaResult] = useState(null)

  const [swRunning, setSwRunning] = useState(false)
  const [swElapsed, setSwElapsed] = useState(0)
  const [swLaps, setSwLaps] = useState([])
  const swBaseRef = useRef(0)
  const swStartedRef = useRef(0)

  useEffect(() => {
    const tick = () => {
      setLive({
        seconds: nowUnix('seconds'),
        ms: nowUnix('milliseconds'),
        zoned: nowInZone(timeZone),
      })
      if (tab === 'relative' && relativeInput.trim()) {
        try {
          setRelativeResult(relativeFrom(relativeInput, timeZone))
        } catch {
          /* ignore while typing */
        }
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [timeZone, tab, relativeInput])

  useEffect(() => {
    if (!swRunning) return undefined
    const id = window.setInterval(() => {
      setSwElapsed(swBaseRef.current + (Date.now() - swStartedRef.current))
    }, 40)
    return () => window.clearInterval(id)
  }, [swRunning])

  const notify = (type, message) => setStatus({ type, message })

  const handleUnix = () => {
    try {
      const next = unixToDate(unixInput, unit === 'milliseconds' ? 'milliseconds' : 'auto', timeZone)
      setFromUnix(next)
      notify('ok', 'Converted timestamp → date')
    } catch (err) {
      setFromUnix(null)
      notify('err', err.message)
    }
  }

  const handleDate = () => {
    try {
      const next = dateToUnix(dateInput, unit, timeZone)
      setFromDate(next)
      notify('ok', 'Converted date → timestamp')
    } catch (err) {
      setFromDate(null)
      notify('err', err.message)
    }
  }

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text))
      notify('ok', 'Copied')
    } catch {
      notify('err', 'Copy failed')
    }
  }

  const zoneLabel = TIMEZONES.find((z) => z.id === timeZone)?.label || timeZone
  const sw = formatStopwatch(swElapsed)

  return (
    <main className={`cron-workspace theme-${theme}`}>
      <div className="cron-card util-card">
        <p className="coming-soon-eyebrow">Timestamp</p>
        <h1>Time tools</h1>
        <p className="cron-lead">
          Convert timestamps, show relative time, estimate ETA, and run a stopwatch. Default zone is IST.
        </p>

        <label className="field">
          <span>Timezone</span>
          <select
            className="cron-input"
            value={timeZone}
            onChange={(e) => {
              setTimeZone(e.target.value)
              setFromUnix(null)
              setFromDate(null)
              setDurResult(null)
              setEtaResult(null)
              notify('ok', `Timezone set to ${e.target.value}`)
            }}
          >
            {TIMEZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </label>

        <div className="ts-tabs" role="tablist" aria-label="Timestamp modes">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`cron-chip ts-tab ${tab === item.id ? 'is-on' : ''}`}
              onClick={() => {
                setTab(item.id)
                setStatus({ type: '', message: '' })
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="ts-active-label">
          Mode: <strong>{TABS.find((t) => t.id === tab)?.label}</strong>
        </p>

        <div className="live-clock">
          <div className="cron-field">
            <span>Now (seconds)</span>
            <strong>{live.seconds}</strong>
          </div>
          <div className="cron-field">
            <span>Now (ms)</span>
            <strong>{live.ms}</strong>
          </div>
          <div className="cron-field">
            <span>Now ({timeZone === 'Asia/Kolkata' ? 'IST' : timeZone})</span>
            <strong>{live.zoned.display}</strong>
          </div>
        </div>

        {tab === 'convert' && (
          <>
            <div className="cron-actions">
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  setUnixInput(String(nowUnix(unit)))
                  setDateInput(nowInZone(timeZone).isoLike)
                  notify('ok', 'Filled with current time')
                }}
              >
                Use now
              </button>
              <label className="field inline-field">
                <span>Unit</span>
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="seconds">Seconds</option>
                  <option value="milliseconds">Milliseconds</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>Unix → Date</span>
              <input
                className="cron-input"
                value={unixInput}
                onChange={(e) => setUnixInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnix()}
                spellCheck={false}
              />
            </label>
            <div className="cron-actions">
              <button type="button" className="action-btn primary" onClick={handleUnix}>
                Convert to date
              </button>
            </div>
            {fromUnix && (
              <div className="cron-result">
                <p>
                  <strong>Selected zone:</strong> {zoneLabel}
                </p>
                <p>
                  <strong>Zoned:</strong> {fromUnix.display}
                </p>
                <p>
                  <strong>Zone local:</strong> {fromUnix.isoLike}
                </p>
                <p>
                  <strong>UTC ISO:</strong> {fromUnix.isoUtc}
                </p>
                <div className="cron-actions">
                  <button type="button" className="action-btn" onClick={() => copyText(fromUnix.display)}>
                    Copy zoned
                  </button>
                  <button type="button" className="action-btn" onClick={() => copyText(fromUnix.isoUtc)}>
                    Copy UTC ISO
                  </button>
                </div>
              </div>
            )}

            <label className="field" style={{ marginTop: '1rem' }}>
              <span>Date → Unix (interpreted in selected timezone if no offset)</span>
              <input
                className="cron-input"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDate()}
                placeholder="2026-08-02 12:00:00"
                spellCheck={false}
              />
            </label>
            <div className="cron-actions">
              <button type="button" className="action-btn primary" onClick={handleDate}>
                Convert to unix
              </button>
            </div>
            {fromDate && (
              <div className="cron-result">
                <p>
                  <strong>Seconds:</strong> {fromDate.unixSeconds}
                </p>
                <p>
                  <strong>Milliseconds:</strong> {fromDate.unixMs}
                </p>
                <p>
                  <strong>Zoned:</strong> {fromDate.display}
                </p>
                <p>
                  <strong>UTC ISO:</strong> {fromDate.isoUtc}
                </p>
                <div className="cron-actions">
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => copyText(unit === 'milliseconds' ? fromDate.unixMs : fromDate.unixSeconds)}
                  >
                    Copy unix
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'relative' && (
          <>
            <label className="field">
              <span>Date or unix timestamp</span>
              <input
                className="cron-input"
                value={relativeInput}
                onChange={(e) => setRelativeInput(e.target.value)}
                placeholder="unix seconds or 2026-08-01 10:00:00"
                spellCheck={false}
              />
            </label>
            <div className="cron-actions">
              <button
                type="button"
                className="action-btn primary"
                onClick={() => {
                  try {
                    setRelativeResult(relativeFrom(relativeInput, timeZone))
                    notify('ok', 'Relative time ready')
                  } catch (err) {
                    setRelativeResult(null)
                    notify('err', err.message)
                  }
                }}
              >
                Show relative
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  setRelativeInput(String(nowUnix('seconds') - 7200))
                  notify('ok', 'Sample: ~2 hours ago')
                }}
              >
                Sample 2h ago
              </button>
            </div>
            {relativeResult && (
              <div className="cron-result">
                <p className="cron-description">{relativeResult.relative}</p>
                <p>
                  <strong>Also:</strong> {relativeResult.short}
                </p>
                <p>
                  <strong>Exact:</strong> {relativeResult.exact}
                </p>
                <p>
                  <strong>UTC ISO:</strong> {relativeResult.isoUtc}
                </p>
                <div className="cron-actions">
                  <button type="button" className="action-btn" onClick={() => copyText(relativeResult.relative)}>
                    Copy relative
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'duration' && (
          <>
            <h2 className="ts-subhead">Duration between two times</h2>
            <label className="field">
              <span>Start</span>
              <input
                className="cron-input"
                value={durStart}
                onChange={(e) => setDurStart(e.target.value)}
                spellCheck={false}
              />
            </label>
            <label className="field">
              <span>End</span>
              <input className="cron-input" value={durEnd} onChange={(e) => setDurEnd(e.target.value)} spellCheck={false} />
            </label>
            <div className="cron-actions">
              <button
                type="button"
                className="action-btn primary"
                onClick={() => {
                  try {
                    setDurResult(calcDuration(durStart, durEnd, timeZone))
                    notify('ok', 'Duration calculated')
                  } catch (err) {
                    setDurResult(null)
                    notify('err', err.message)
                  }
                }}
              >
                Calculate duration
              </button>
            </div>
            {durResult && (
              <div className="cron-result">
                <p className="cron-description">{durResult.duration.text}</p>
                <p>
                  <strong>Start:</strong> {durResult.start.display}
                </p>
                <p>
                  <strong>End:</strong> {durResult.end.display}
                </p>
                <p>
                  <strong>Total ms:</strong> {durResult.ms}
                </p>
              </div>
            )}

            <h2 className="ts-subhead">ETA from progress</h2>
            <label className="field">
              <span>Started at</span>
              <input
                className="cron-input"
                value={etaStart}
                onChange={(e) => setEtaStart(e.target.value)}
                spellCheck={false}
              />
            </label>
            <div className="eta-row">
              <label className="field">
                <span>Done</span>
                <input className="cron-input" value={etaDone} onChange={(e) => setEtaDone(e.target.value)} />
              </label>
              <label className="field">
                <span>Total</span>
                <input className="cron-input" value={etaTotal} onChange={(e) => setEtaTotal(e.target.value)} />
              </label>
            </div>
            <div className="cron-actions">
              <button
                type="button"
                className="action-btn primary"
                onClick={() => {
                  try {
                    setEtaResult(calcEta({ startRaw: etaStart, done: etaDone, total: etaTotal, timeZone }))
                    notify('ok', 'ETA estimated')
                  } catch (err) {
                    setEtaResult(null)
                    notify('err', err.message)
                  }
                }}
              >
                Estimate ETA
              </button>
            </div>
            {etaResult && (
              <div className="cron-result">
                <p className="cron-description">ETA: {etaResult.eta.display}</p>
                <p>
                  <strong>Progress:</strong> {etaResult.percent}%
                </p>
                <p>
                  <strong>Elapsed:</strong> {etaResult.elapsed.text}
                </p>
                <p>
                  <strong>Remaining:</strong> {etaResult.remaining.text}
                </p>
                <p>
                  <strong>Rate:</strong> {etaResult.ratePerSec.toFixed(3)} units/sec
                </p>
              </div>
            )}
          </>
        )}

        {tab === 'stopwatch' && (
          <>
            <div className="stopwatch-display">{sw.display}</div>
            <div className="cron-actions">
              {!swRunning ? (
                <button
                  type="button"
                  className="action-btn primary"
                  onClick={() => {
                    swStartedRef.current = Date.now()
                    setSwRunning(true)
                    notify('ok', 'Stopwatch running')
                  }}
                >
                  {swElapsed ? 'Resume' : 'Start'}
                </button>
              ) : (
                <button
                  type="button"
                  className="action-btn primary"
                  onClick={() => {
                    swBaseRef.current = swElapsed
                    setSwRunning(false)
                    notify('ok', 'Paused')
                  }}
                >
                  Pause
                </button>
              )}
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  if (!swRunning && swElapsed === 0) return
                  const stamp = formatStopwatch(swElapsed).display
                  setSwLaps((prev) => [`Lap ${prev.length + 1}: ${stamp}`, ...prev].slice(0, 20))
                  notify('ok', 'Lap saved')
                }}
              >
                Lap
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  setSwRunning(false)
                  swBaseRef.current = 0
                  swStartedRef.current = 0
                  setSwElapsed(0)
                  setSwLaps([])
                  notify('ok', 'Reset')
                }}
              >
                Reset
              </button>
              <button type="button" className="action-btn" onClick={() => copyText(sw.display)}>
                Copy
              </button>
            </div>
            {swLaps.length > 0 && (
              <div className="cron-result">
                <p className="technique-label">Laps</p>
                <ul className="sw-laps">
                  {swLaps.map((lap) => (
                    <li key={lap}>{lap}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {status.message && <p className={`status ${status.type}`}>{status.message}</p>}
      </div>
    </main>
  )
}
