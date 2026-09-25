# QuickTools

QuickTools is a collection of 15 lightweight browser utilities. All tool processing stays on the visitor's device; the deployed website consists only of static HTML, CSS, JavaScript, and local assets.

## Project structure

- `artifacts/quicktools/public/` — complete deployable website
- `artifacts/quicktools/public/index.html` — homepage and tool directory
- `artifacts/quicktools/public/<tool-name>/index.html` — each tool's own static page and URL
- `artifacts/quicktools/public/assets/` — shared styles, browser JavaScript, and local library files

## Deploy to Cloudflare Pages

Connect this repository to Cloudflare Pages and use:

- **Framework preset:** None
- **Build command:** leave blank
- **Build output directory:** `artifacts/quicktools/public`
- **Environment variables:** none

Cloudflare serves the files directly. No build, backend, database, API key, or Node.js runtime is needed in production.

## Local preview

The optional Replit preview uses Vite only as a development file server:

```sh
pnpm --filter @workspace/quicktools run dev
```

To copy the exact static deployment files into the Replit artifact's generated output:

```sh
pnpm --filter @workspace/quicktools run build
```

This copy step is not required for Cloudflare Pages.