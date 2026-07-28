# JSON Formatter

Browser-based JSON beautifier, validator, minifier, and converter (XML / CSV).

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Deploy publicly (free)

### Vercel
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → Import project → select the repo
3. Deploy (defaults work for Vite)

Or from the CLI:

```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### Cloudflare Pages
Connect the GitHub repo, build command `npm run build`, output directory `dist`.

## Features

- Format / beautify with 2, 3, 4 spaces or tabs
- Minify
- Validate
- Convert JSON → XML or CSV
- Upload, download, copy, sample data
