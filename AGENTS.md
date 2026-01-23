# Repository Guidelines

## Project Structure & Module Organization
This repo is a small Vercel-hosted reader app. Key locations:
- `api/` contains serverless endpoints (`library.js`, `feeds.js`) that handle database access, article parsing, and feed management.
- `src/` contains the React UI (views, components, styles).
- `public/` stores legacy redirect shells (`reader.html`, `highlights.html`, `feeds.html`, `settings.html`) that forward to the SPA.
- `index.html` is the Vite entry point; `vite.config.js` configures dev/build output.
- `package.json` defines runtime dependencies and local scripts.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` runs the Vite dev server for the UI.
- `npm run dev:api` runs `vercel dev` for local API routes (use alongside `npm run dev`).
- `npm run build` produces the production build in `dist/`.
- `npm run preview` serves the production build locally.

## Coding Style & Naming Conventions
- JavaScript uses 2-space indentation, semicolons, and `const`/`let` (no TypeScript).
- Use `camelCase` for JS variables/functions and `snake_case` for SQL column names (consistent with the DB schema).
- Keep filenames lowercase and colocate new UI pages in `public/` and API handlers in `api/`.

## Testing Guidelines
No automated tests are configured. Validate changes by running the local app and exercising:
- UI flows in the SPA (`index.html` + `src/`).
- API routes (e.g., `GET /api/library?type=list`, `POST /api/feeds?type=refresh_feeds`).
Add tests only if you introduce a framework; otherwise keep manual verification notes in PRs.

## Commit & Pull Request Guidelines
Git history only shows “init commit”, so there is no established convention. Use short, imperative messages (e.g., “Add feed refresh guard”). For PRs:
- Describe the change and impact.
- Include test steps and expected results.
- Add screenshots for UI changes when applicable.

## Security & Configuration
Do not commit secrets. Required environment variables:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `MY_SECRET_KEY` (must match the `x-auth-key` header on API requests)
