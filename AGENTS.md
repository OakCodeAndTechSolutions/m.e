# AGENTS.md

## Cursor Cloud specific instructions

This repository is a single Next.js 16 (App Router, Turbopack, React 19, TypeScript) marketing/portfolio site named `m.e` (branded "OakCodeAndTechSolutions"). It is a fully static/SSG frontend with no backend service, database, or other companion services to run.

### Services

There is exactly one service: the Next.js app.

- Dev server: `npm run dev` (serves on `http://localhost:3000`). Startup is fast (~ a few hundred ms to "Ready"; first page compile is on-demand).
- Standard commands are defined in `package.json` scripts: `dev`, `build`, `start`, `lint`, `lint:fix`, `format`, `type-check`, `test` and `generate:learning-room-models`.

### Non-obvious notes

- Validation commands are `npm run lint`, `npm run type-check`, and `npm run test`. Keep all three passing before release.
- All `process.env.NEXT_PUBLIC_*` variables (EmailJS, reCAPTCHA, PostHog, Google Analytics/GSC) are optional and only gate third-party integrations. The app builds and runs fully without them.
- Because of the above, the multi-step contact form at `/contact` walks through its steps and client-side validation without any secrets, but the final submit intentionally fails with "reCAPTCHA site key is not configured." unless `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and the `NEXT_PUBLIC_EMAILJS_*` vars are provided. This failure is expected in the cloud environment.
- Switchboard devices (RCBOs, main switch, escutcheon) are procedural geometry in `components/effects/switchboard/devices/`, dimensioned in real millimetres via `din.ts`; there are no switchboard model files to regenerate.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
