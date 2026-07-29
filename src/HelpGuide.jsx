import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export const TOUR_STEPS = [
  {
    target: 'tour-tools-tabs',
    title: '1. Choose a tool',
    body: 'A2Z Formatter has multiple tools. JSON and XML are live. YAML and JS/HTML/CSS show Soon until they ship.',
  },
  {
    target: 'tour-input',
    title: '2. Input panel',
    body: 'Paste or type data here for the selected tool. Use Sample, Paste, or Open to load quickly.',
  },
  {
    target: 'tour-tools',
    title: '3. Actions',
    body: 'Use Validate, Format, Minify, and Download here. Open Advanced features for sort, convert, path, tree, and more.',
  },
  {
    target: 'tour-format',
    title: '4. Format / Beautify',
    body: 'Pretty-print JSON with your chosen indentation. Shortcut: Ctrl+Enter. Invalid JSON with comments/trailing commas is auto-repaired into Output only.',
  },
  {
    target: 'tour-output',
    title: '5. Output panel',
    body: 'Results appear here. Switch Code / Tree / Diff from the toolbar, then Copy or Download.',
  },
  {
    target: 'tour-header-actions',
    title: '6. History & theme',
    body: 'Restore recent work from History, or toggle Dark / Light. Tour and How to use live here too.',
  },
]

const HOW_TO_SECTIONS = [
  {
    title: 'Quick start',
    items: [
      'A2Z Formatter is a toolkit — JSON and XML are live; YAML and JS/HTML/CSS are coming soon.',
      'Pick a tool tab in the header (JSON or XML).',
      'Click Sample (or paste) in the Input panel.',
      'Choose indentation, then Format / Beautify — result appears in Output.',
      'Copy or Download the result.',
      'Open Advanced features for extra conversions and tools.',
    ],
  },
  {
    title: 'Common tools',
    items: [
      'Validate — checks syntax and shows line/column on errors.',
      'Minify — removes whitespace for compact JSON.',
      'Advanced → Sort Keys — alphabetizes object keys deeply.',
      'Advanced → Repair JSON — strips comments and trailing commas.',
      'Advanced → Flatten / Unflatten — nested ↔ path-key maps.',
      'Advanced → Diff — compare Input vs Output.',
      'Advanced → Convert — export to XML, CSV, YAML, or TypeScript.',
      'Advanced → JSON Path — pull a nested value (e.g. meta.tags.0).',
    ],
  },
  {
    title: 'Views & sharing',
    items: [
      'Advanced → Code / Tree — browse Output as text or a tree.',
      'Advanced → Share Link — copies a URL that reloads your JSON.',
      'History — last 12 payloads saved in this browser.',
      'Dark / Light — editor theme preference is remembered.',
    ],
  },
  {
    title: 'Keyboard shortcuts',
    items: [
      'Ctrl+Enter — Format / Beautify',
      'Ctrl+Shift+M — Minify',
      'Ctrl+Shift+S — Share link',
    ],
  },
]

export function HowToUseModal({ open, onClose, onStartTour }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="how-to-title">How to use</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          {HOW_TO_SECTIONS.map((section) => (
            <section key={section.title} className="help-section">
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="modal-foot">
          <button
            type="button"
            className="action-btn primary"
            onClick={() => {
              onClose()
              onStartTour()
            }}
          >
            Start tour
          </button>
          <button type="button" className="action-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

export function TourOverlay({ stepIndex, onNext, onBack, onClose }) {
  const step = TOUR_STEPS[stepIndex]
  const [rect, setRect] = useState(null)
  const [tipStyle, setTipStyle] = useState({ top: 24, left: 24 })
  const cardRef = useRef(null)

  useLayoutEffect(() => {
    if (!step) return undefined

    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (!el) {
        setRect(null)
        return
      }
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      const r = el.getBoundingClientRect()
      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      })
    }

    measure()
    const t = window.setTimeout(measure, 60)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, stepIndex])

  useLayoutEffect(() => {
    const margin = 12
    const cardW = Math.min(320, window.innerWidth - 24)
    const cardH = cardRef.current?.offsetHeight || 180
    const vw = window.innerWidth
    const vh = window.innerHeight

    if (!rect) {
      setTipStyle({
        top: Math.max(margin, (vh - cardH) / 2),
        left: Math.max(margin, (vw - cardW) / 2),
      })
      return
    }

    const hole = {
      top: Math.max(8, rect.top - 8),
      left: Math.max(8, rect.left - 8),
      width: Math.min(rect.width + 16, vw - 16),
      height: Math.min(rect.height + 16, vh - 16),
    }

    const spaceBelow = vh - hole.top - hole.height
    const spaceAbove = hole.top
    const targetTooTall = hole.height > vh * 0.4

    let top
    if (targetTooTall) {
      top = Math.min(vh - cardH - margin, Math.max(margin, 72))
    } else if (spaceBelow >= cardH + margin) {
      top = hole.top + hole.height + margin
    } else if (spaceAbove >= cardH + margin) {
      top = hole.top - cardH - margin
    } else {
      top = Math.max(margin, (vh - cardH) / 2)
    }

    top = Math.max(margin, Math.min(top, vh - cardH - margin))
    const left = Math.max(margin, Math.min(hole.left, vw - cardW - margin))
    setTipStyle({ top, left })
  }, [rect, stepIndex])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'Enter') onNext()
      if (e.key === 'ArrowLeft') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNext, onBack, onClose])

  if (!step) return null

  const pad = 8
  const hole = rect
    ? {
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: Math.min(rect.width + pad * 2, window.innerWidth - 16),
        height: Math.min(rect.height + pad * 2, window.innerHeight - 16),
      }
    : null

  const isLast = stepIndex === TOUR_STEPS.length - 1

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Product tour">
      <div className="tour-shade" onClick={onClose} />
      {hole && (
        <div
          className="tour-hole"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
        />
      )}
      <div className="tour-card" ref={cardRef} style={tipStyle}>
        <div className="tour-progress">
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-actions">
          <button type="button" className="action-btn" onClick={onClose}>
            Skip
          </button>
          <div className="tour-nav">
            <button type="button" className="action-btn" onClick={onBack} disabled={stepIndex === 0}>
              Back
            </button>
            <button type="button" className="action-btn primary" onClick={onNext}>
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

