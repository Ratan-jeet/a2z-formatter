import { useMemo, useRef, useState } from 'react'
import { MARKDOWN_SAMPLE, renderMarkdown } from './markdownUtils'

export default function MarkdownWorkspace({ theme, EditorPane, remember }) {
  const [input, setInput] = useState(MARKDOWN_SAMPLE)
  const [status, setStatus] = useState({ type: 'ok', message: 'Live preview on' })
  const fileInputRef = useRef(null)

  const html = useMemo(() => renderMarkdown(input), [input])

  const notify = (type, message) => setStatus({ type, message })

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setInput(String(reader.result ?? ''))
      remember?.(String(reader.result ?? ''))
      notify('ok', `Loaded ${file.name}`)
    }
    reader.onerror = () => notify('err', 'Failed to read file')
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <main className="workspace markdown-workspace">
      <EditorPane
        title="Markdown"
        variant="input"
        language="markdown"
        tourId="tour-input"
        value={input}
        onChange={(v) => {
          setInput(v)
          notify('ok', 'Live preview on')
        }}
        theme={theme}
        acceptFiles=".md,.markdown,text/markdown,text/plain"
        onClear={() => setInput('')}
        onCopy={async () => {
          try {
            await navigator.clipboard.writeText(input)
            notify('ok', 'Copied markdown')
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
          setInput(MARKDOWN_SAMPLE)
          notify('ok', 'Sample loaded')
        }}
        onUpload={handleUpload}
        onDownload={() => {
          const blob = new Blob([input], { type: 'text/markdown;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'document.md'
          a.click()
          URL.revokeObjectURL(url)
          notify('ok', 'Downloaded document.md')
        }}
        fileInputRef={fileInputRef}
        onNotify={notify}
      />

      <aside className="controls" data-tour="tour-tools">
        <button type="button" className="action-btn upload-data-btn" onClick={() => fileInputRef.current?.click()}>
          Upload .md
        </button>
        <button
          type="button"
          className="action-btn primary"
          data-tour="tour-format"
          onClick={() => {
            remember?.(input)
            notify('ok', 'Preview updated')
          }}
        >
          Refresh Preview
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(html)
              notify('ok', 'HTML copied')
            } catch {
              notify('err', 'Copy failed')
            }
          }}
        >
          Copy HTML
        </button>
        <p className="shortcuts-hint">Edit left · live sanitized preview right</p>
        {status.message && <p className={`status ${status.type}`}>{status.message}</p>}
      </aside>

      <section className={`editor-pane markdown-preview theme-${theme}`} data-tour="tour-output">
        <div className="editor-toolbar">
          <div className="toolbar-icons" />
          <span className="editor-title">Preview</span>
        </div>
        <div
          className="markdown-preview-body"
          dangerouslySetInnerHTML={{ __html: html || '<p class="preview-empty">Nothing to preview</p>' }}
        />
      </section>
    </main>
  )
}
