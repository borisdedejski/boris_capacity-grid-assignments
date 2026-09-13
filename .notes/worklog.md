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

## 2026-09-13 — API: GET /api/capacity and PATCH /api/people/{id}

- Week = Monday–Sunday, and only Mon–Fri carry hours: `hours_per_day` × the weekdays an assignment covers, summed over every assignment active that day. Evidence in the seed: `weekly_hours` are 5-day multiples (40/32/24/20), Ana's 15 rows in the week of 2025-12-29 sum to 8 h/day = exactly her 40, and the planted Fri→Mon assignment (Bo, 2026-01-09..12) only makes sense if Sat/Sun count for nothing. Counting 7 days would put Ana's exactly-full week at 56/40 and raise the over-allocated count for the week of 2026-01-05 from 33 people to 45.
- The range widens outward to whole weeks and the response says which weeks it covers. Prorating the edge weeks would show a manager smaller numbers than the real week, which is the wrong direction for "who is over-committed".
- Capacity is `weeklyHours` on the person, not repeated per cell; `allocated` is a positional array matching `weeks`. One year × 500 people is 96 KB (measured) instead of ~1 MB with per-cell objects. If per-week capacity ever varies (time off, holidays), add a parallel `capacity` array per person; nothing else changes.
- Range capped at 53 weeks. Measured on the seed (500 people, 126k assignments): 3 weeks ≈ 6 ms, 53 weeks ≈ 70 ms. `generate_series` for the weeks made the planner guess 1000 rows and kick in JIT (+200 ms); passing the Mondays as `unnest($1::date[])` fixes the estimate.
- No pagination of people: a manager wants the whole team on one screen to spot over-allocation, and 500 rows is a rendering problem (virtualise), not a transfer one. Extension if the team grows: cursor on `(name, id)` plus a sort/filter on over-allocation.
- Noticed: the seed has many identical assignment rows (same person, project, dates, hours; Ana has 14 × 0.5 h/day on Atlas for one week). They are summed as separate assignments. No way to tell duplicates from a generator artefact without the domain, so the API takes the data at its word.
- Noticed: Eli Nakamura has `weekly_hours` 0 and 20 h allocated in the week of 2026-01-05. The API returns both as-is; the grid must treat any allocation against 0 capacity as over, and not divide by it.
- PATCH body is `{"weeklyHours": n}`, 0–168, unknown fields rejected so `weekly_hours` fails loudly instead of no-op'ing. Returns the updated person only: allocations don't change and capacity for every week is `weeklyHours`, so the grid can patch its cached row. How the grid does that is decided in the grid step.
- Errors stay plain text (`http.Error`), matching the health handler and the existing `fetchJson` client. DB errors are logged and the client gets "internal error".
- Left out: optimistic concurrency on PATCH (last write wins), and a request timeout on the capacity query. Both are one-liners once there's a reason.

## 2026-09-13 — Grid: view, navigate, edit

- After a save, the grid patches what it already has. The mutation takes the person the API returns and writes `weeklyHours` into every cached capacity range (`setQueriesData` on the `['capacity']` prefix). Allocations don't depend on weekly hours, so no refetch; not optimistic, because a ~10 ms request doesn't earn a rollback path. A refetch of 500 rows for one field felt wasteful, and the response is authoritative anyway.
- Cell states: red for allocated > weeklyHours (shows the overage in hours), amber for exactly full, muted dash for nothing scheduled. Percent only when capacity > 0; with 0 capacity any allocation is over and there is no ratio to show.
- Navigation lives in the store: `shiftWeeks(±1)` keeps the range length, date inputs set it outright, presets (4/8/13 wk, Today) snap to a Monday. The store doesn't validate; from > to or > 53 weeks surfaces as the API's 400 text in the grid, with a retry button.
- `keepPreviousData` so stepping through weeks fades the old grid instead of blanking it. `staleTime` 30 s so a back-and-forth doesn't refetch every time.
- "Over-allocated only" filter and the team footer row are plain component state; they belong to the grid, not the shared range.
- The `App.tsx` "{from} to {to}" line is kept as-is: an existing test asserts it.
- shadcn Button + Input added via the CLI in the container (first components that a feature needed).
- Not verified in a browser this session (built without a screenshot tool); tsc passes and the dev server serves the modules. No new tests: those come next in a separate session.

## 2026-09-13 — Grid on TanStack Table, editing in a popover, opens on today

- Bug: the grid opened on 2025-12-29 because the store default was a hard-coded range. It now opens on the Monday of the current week, four weeks ahead. `App.test.tsx` asserts the old literal range and needs updating (tests are a separate session).
- TanStack Table `@tanstack/react-table` 9.2.4 (latest at install). v9 is not the v8 API most examples show: `useTable`, features registered with `tableFeatures`, column options `sortFn`/`filterFn`. The package ships its own `skills/` folder and the core package has one per feature; those, plus the installed `.d.ts`, are what the grid was written from. Only sorting, global filtering and column filtering are registered.
- Table state stays inside the table; the toolbar calls `table.setGlobalFilter` and `column.setFilterValue` (feature methods) rather than controlling slices from React. Rows are the query result mapped once to add `peak` (busiest week / capacity) so sorting by "most over-allocated" is one click and the over-only switch is a column filter, not a second data copy.
- Editing: the Capacity column is a bordered button with a pencil (the earlier hover-only pencil was invisible). It opens a popover with the number, presets 20/24/32/40, Save/Cancel; double-clicking a row opens the same popover. One editor open at a time via a small context above the table.
- Over-allocation: red cell tint, red text, a "+6 h" badge with the overage, and a utilization bar under every number so under/full/over reads at a glance. Peak column shows ∞ for hours against zero capacity.
- No dark-mode variants on the red/amber classes: the app has no theme toggle (see the bootstrap entry).
- Impeccable skill reported no PRODUCT.md and an available update (v4.3.1); skipped both to keep moving, worth a decision later.
- Still not looked at in a browser this session: tsc passes and Vite transforms every module, but the visual check is the next thing to do.
