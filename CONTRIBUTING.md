# Contributing to MindFlow

## Quick Start

```bash
git clone https://github.com/anton12o/MindFlow.git
cd MindFlow

# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m pytest -q          # verify 123+ tests pass

# Frontend
cd ../frontend
npm install
npx vitest run               # verify 80+ tests pass
node node_modules/typescript/bin/tsc --noEmit  # zero type errors
node node_modules/typescript/bin/tsc -b && npx vite build
```

## Before You Code

Read **[AGENTS.md](AGENTS.md)** — it is the single source of truth for:

- **Workflow:** Kanban + XP Lite + Lean (columns, WIP limits, gates)
- **Filtro 0→6:** Decision framework — only implement what's needed
- **Rules:** What to never do (delete DB, force push, add comments without asking, etc.)
- **Git flow:** Branch naming, commit format, PR conventions
- **Incident history:** Past bugs to avoid repeating

**This file is updated with every release. Do not skip it.**

## Code Conventions

### General
- No comments in code unless explicitly asked
- Tailwind v4: use `@theme` in CSS, no `tailwind.config.*`
- Error logging: `console.error('[contexto]', e)` (frontend), `logging.error` (backend)
- Dates: always `formatDateLocal()` / `hojeLocal()`, never `toISOString()`

### Backend (Python)
- FastAPI + SQLModel + SQLite + Alembic
- All write endpoints must have `try/commit/except/rollback` pattern
- SQL queries must be parameterized (no f-string concatenation)
- Every model change = Alembic migration
- Run before commit: `pytest -q && ruff check .`

### Frontend (TypeScript/React)
- Vite + React 19 + TypeScript + Tailwind v4 + React Query
- Destructive actions must use `ConfirmModal`
- Mutations must use `onError` with `console.error` + `useNotify()`
- Modal focus traps must use `useFocusTrap`
- Run before commit: `npx vitest run && node node_modules/typescript/bin/tsc --noEmit && node node_modules/typescript/bin/tsc -b && npx vite build`

## Commit Format

We follow **Conventional Commits**:

```
tipo: descricao concisa em portugues (< 80 chars)
```

Valid types: `fix:`, `feat:`, `refactor:`, `docs:`, `build(deps):`,
`build(deps-dev):`, `release:`, `test:`, `chore:`

The commit message hook validates this automatically. Example:

```
fix: corrige validacao de data no DELETE /sessoes
```

## Branch Naming

- `fix/descricao` — bug fixes
- `feat/descricao` — new features
- `docs/descricao` — documentation

## PR Workflow

1. Create branch from `main`
2. Implement + run all checks
3. Push and open PR
4. Squash-merge to main
5. Tag + release via `gh release create`

No force-push on `main` (branch protection enabled).

## Testing

- **Backend:** `cd backend && python -m pytest -q` (123+ tests)
- **Frontend:** `cd frontend && npx vitest run` (80+ tests)
- **E2E:** `cd frontend && npm run test:e2e` (3 specs, requires Playwright)
- **Coverage:** `cd backend && python -m pytest --cov=. --cov-report=term-missing`
- **Lint:** `cd backend && ruff check .` (zero errors required)

## Questions?

Open a [GitHub Discussion](https://github.com/anton12o/MindFlow/discussions)
or check [AGENTS.md](AGENTS.md) for detailed workflow rules.
