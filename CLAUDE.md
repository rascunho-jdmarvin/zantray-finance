# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at localhost:8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint
npm run test         # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
npm run preview      # Preview production build
```

## Architecture

**OrganizAI** is a personal finance management SPA built with React 18 + TypeScript + Vite, backed by Supabase (PostgreSQL + Auth).

### Data Flow

```
Pages/Components
  → useApp() / useFinance() hooks
  → AppContext / FinanceContext (React Context API)
  → ApiService (src/services/api.ts)
  → Supabase JS SDK
  → PostgreSQL (RLS-protected per user)
```

### Key Layers

**State Management — `src/contexts/`**
- `AppContext.tsx`: Central state hub — auth session, user profile, contas, investimentos, projetos, current month. Exposes `useApp()` hook.
- `FinanceContext.tsx`: Wraps finance-specific hooks (`useDespesas`, `useProjetos`) and provides computed properties. Exposes `useFinance()` hook.

**Service Layer — `src/services/api.ts`**
- Single `ApiService` class wrapping all Supabase interactions.
- Handles snake_case (DB) ↔ camelCase (frontend) conversions.
- All mutations go through this class — never call Supabase directly from components.

**Custom Hooks — `src/hooks/useFinance.ts`**
- `useDespesas`: Maps DB `contas` records to the frontend `Despesa` type with computed totals and filtering.
- `useProjetos`: Wraps AppContext projetos with helper methods.

**Routing — `src/App.tsx`**
- Public: `/auth`
- Onboarding: `/onboarding` (requires auth, incomplete onboarding)
- Protected (wrapped in `FinanceProvider`): `/dashboard`, `/despesas`, `/projetos`, `/calendario`
- `ProtectedRoute` redirects unauthenticated users to `/auth` and non-onboarded users to `/onboarding`.

### Database Schema (Supabase)

```
profiles          — user profile, salary, onboarding_completed flag
contas            — expenses/bills (mapped to Despesa on frontend)
investimentos     — investment records
projetos          — projects with status (planejado/em_andamento/concluido)
projeto_itens     — project line items, optionally linked to a conta
analises          — AI-generated financial analyses (jsonb recomendacoes)
categorias        — shared reference table (public read)
```

All tables use Row Level Security — users only see their own data.

### Type System

- `src/types/index.ts` — core domain types: `User`, `Conta`, `Investimento`, `Projeto`, `Analise`
- `src/types/finance.ts` — finance types: `Despesa` (frontend view of `contas`), `ProjetoStatus`
- The DB column `contas` is referred to as `Despesa` in the frontend everywhere.

### UI Stack

- **Components:** shadcn-ui primitives in `src/components/ui/` (Radix UI based)
- **Styling:** Tailwind CSS with CSS variable–based theming (dark mode via `.dark` class)
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Notifications:** Sonner (`toast()`)
- **Forms:** React Hook Form + Zod

### Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

The Supabase client is initialized in `src/lib/supabase.ts` and used exclusively via `ApiService`.

### Path Alias

`@/` maps to `./src/` — use this for all imports.
