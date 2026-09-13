# Worklog

Running notes on how this got built — decisions, assumptions, dead ends, and anything
left unfinished. Append as you go; a line or two per entry is right.

---

## 2026-09-13 — Bootstrap: UI kit and API docs

- UI kit: Tailwind v4 + shadcn/ui (Radix base, `nova` preset, neutral). Picked for speed and because components land in the repo as plain code. Add components only when a feature needs them.
- All npm commands run inside the web container (node:24-alpine), not on the host. Tailwind and Vite 8 ship per-platform native binaries, and this way the lockfile is written by the same npm that installs from it. Checked: the lockfile has linux-musl entries for arm64 and x64.
- The `@/` alias is defined only in tsconfig.json. Vite 8 reads it via `resolve.tsconfigPaths`, so no `path.resolve` / `@types/node` in vite.config.ts.
- `shadcn init` loosened the existing `@types/react` pin to `^` and added its deps as ranges. Re-pinned everything to exact versions to match the repo. Its new `cn` package (replaces clsx + tailwind-merge) is published by shadcn himself; checked before keeping it.
- API docs: hand-written `api/openapi.yaml`, embedded with go:embed, served at `/api/openapi.yaml` and rendered by Scalar at `/api/docs` (pinned CDN build). No Go deps or codegen, which matters with no local Go and a fixed Dockerfile. Rule: a handler and its spec change in the same commit. The docs page needs internet for the Scalar script.
- Dropped the scaffold's OS-following dark mode (`color-scheme: light dark`). shadcn's theme switches on a `.dark` class, and a toggle isn't worth it here.
- Kept the uncommitted tsconfig change that removed `types: ["vite/client"]`. Nothing uses `import.meta.env` or asset imports yet; add it back if that changes.

## 2026-09-13 — State, validation and test setup

- State split: TanStack Query owns server data (capacity, the hours edit). Zustand holds screen state only, starting with the date range, because the logged-time timeline will share that range with the grid. Server data never goes in the store.
- Zod checks every API response in `fetchJson` before components see it, and will validate the hours input. The schemas are a hand-written copy of `openapi.yaml`, so handler, spec and schema change in the same commit. Codegen (orval, hey-api) isn't worth it for two endpoints.
- Vitest 4.1.11 over 5.0.0: 5.0 was ten days old, and 4.1 already supports Vite 8.
- Web tests: Vitest + Testing Library + MSW. A request no test mocked fails the test (`onUnhandledRequest: 'error'`). `renderWithClient` gives each test its own query cache with retries off.
- API tests run against the real Compose Postgres, each in its own schema built from `db/schema.sql` and dropped afterwards. The seeded data is never read or changed, and fixtures stay tiny. Checked: the health test sees its 2 fixture people, not the 500 seeded.
- Moved route registration into `server.routes()` so tests go through the real mux (`{id}` path values only exist when routed).
- `scripts/test.sh [api|web]` runs both suites in Docker, since the Makefile is off-limits. API tests use `docker compose run` on the api image (it already has Go). Web tests use the running dev container, so they need `make up`.
- npm 11 skips msw's postinstall ("not yet covered by allowScripts"). It only copies the browser worker file, which we don't use.
