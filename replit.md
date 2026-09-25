# QuickTools

QuickTools is a privacy-first collection of 15 utilities delivered as independent static HTML pages.

## Source of truth

- `artifacts/quicktools/public/` contains the complete Cloudflare Pages site.
- HTML pages live in route-named directories; shared browser code and styles live in `public/assets/`.
- Every feature runs client-side. Do not add a backend, database, router, TypeScript, or browser-to-server API calls.

## Local preview

- `pnpm --filter @workspace/quicktools run dev` starts the local preview.
- `pnpm --filter @workspace/quicktools run build` copies the static site to `artifacts/quicktools/dist/public/`.

## Cloudflare Pages

- Framework preset: None
- Build command: leave blank
- Build output directory: `artifacts/quicktools/public`
- Environment variables: none

The Cloudflare deployment is the contents of `public/` as-is. It does not run Node.js.