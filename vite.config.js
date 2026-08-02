import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

/** Serve static marketing pages from /public in Vite (SPA fallback otherwise wins). */
function staticHtmlPages(pages) {
  return {
    name: 'static-html-pages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = (req.url || '').split('?')[0]
        const hit = pages.find((p) => raw === p.route || raw === `${p.route}/`)
        if (!hit) return next()
        const file = path.join(rootDir, 'public', hit.file)
        if (!fs.existsSync(file)) return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(fs.readFileSync(file))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    staticHtmlPages([
      { route: '/privacy', file: 'privacy/index.html' },
      { route: '/json-formatter', file: 'json-formatter/index.html' },
    ]),
    react(),
  ],
})
