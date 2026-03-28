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
npx tsc --noEmit    # Type-check without emitting files
```

## Architecture

**OrganizAI** is a personal finance management SPA built with React 18 + TypeScript + Vite, backed by Supabase (PostgreSQL + Auth).

### Data Flow

```
Pages/Components
  → useApp() / useFinance() / useBancos() / useTransacoes() / useImportacao() hooks
  → AppContext / FinanceContext (React Context API)
  → ApiService (src/services/api.ts)
  → Supabase JS SDK
  → PostgreSQL (RLS-protected per user)
```

### Key Layers

**State Management — `src/contexts/`**
- `AppContext.tsx`: Central state hub — auth session, user profile, contas, investimentos, projetos, importacoes, current month. Exposes `useApp()` hook. Includes `updateProjetoItemLocal()` for optimistic item updates without API re-insert.
- `FinanceContext.tsx`: Wraps `useDespesas()` + `useProjetos()` and provides computed properties to all protected routes. Exposes `useFinance()` hook.

**Service Layer — `src/services/api.ts`**
- Single `ApiService` class (exported as singleton `api`) wrapping all Supabase interactions.
- Handles snake_case (DB) ↔ camelCase (frontend) conversions via internal mapper functions (`mapConta`, `mapTransacao`, `mapBanco`, `mapImportacao`, etc.).
- All mutations go through this class — **never call Supabase directly from components**.
- Key method groups: Auth, Contas, Extrato (Transacoes), Bancos, Transferencias, Importacao, Dashboard/Analytics, Investimentos, Projetos, Usuarios, Categorias.

**Custom Hooks — `src/hooks/`**
- `useFinance.ts`: `useDespesas()` maps DB `contas` → `Despesa` with computed totals and tab splits (fixas/variaveis/parceladas/proximasVencer/parcelasProjetadas). `useProjetos()` wraps AppContext projetos.
- `useTransacoes.ts`: Paginated real transactions with URL-driven filters (`TransacoesFiltros` incl. bancoId), React Query.
- `useBancos.ts`: React Query hook for bank accounts — `getBancos()`, `createBanco()`.
- `useImportacao.ts`: State machine for the file import wizard (upload → reviewing → done). Manages `bancoId` and per-item `tipoEditado` fields.

**Routing — `src/App.tsx`**
- Provider order: `QueryClientProvider` → `TooltipProvider` → `AppProvider` → `BrowserRouter`
- Public: `/auth`
- Onboarding: `/onboarding` (requires auth, incomplete onboarding)
- Protected (`ProtectedRoute` wraps in `FinanceProvider` + `AppLayout`): `/dashboard`, `/despesas`, `/projetos`, `/calendario`, `/transacoes`, `/importacao`

### Database Schema (Supabase)

```
profiles          — user profile (name, phone, salario_bruto, salario_liquido, onboarding_completed)
contas            — planned expenses/bills (mapped to Despesa on frontend)
                    columns: parcelada, total_parcelas, parcelas_pagas (added in migration_v4)
investimentos     — investment records
projetos          — projects (status: planejado/em_andamento/concluido)
projeto_itens     — project line items (is_completed, optionally linked to a conta)
analises          — AI-generated financial analyses (jsonb recomendacoes)
categorias        — shared reference table (public read)
transacoes        — real bank movements / extrato; banco_id FK (added in migration_v3)
importacoes       — file import metadata; banco_id FK (added in migration_v3)
bancos            — user bank accounts/cards (created in migration_v3)
```

All tables use Row Level Security — users only see their own data via `auth.uid() = user_id`.

#### Pending Migrations (must be applied in Supabase SQL Editor before testing)
- `migration_v3.sql` — creates `bancos` table + adds `banco_id` to `transacoes` and `importacoes`
- `migration_v4.sql` — adds `parcelada`, `total_parcelas`, `parcelas_pagas` to `contas`

### Type System

- `src/types/index.ts` — core domain types:
  - `User`, `Conta` (with parcelamento fields), `Banco`/`BancoTipo` (corrente/poupanca/credito/investimento)
  - `Investimento`, `Projeto`, `ProjetoItem`, `Analise`
  - `Transacao`/`TransacaoTipo` (entrada/saida), `Importacao`, `TransacaoImportada`
  - `ContaCategoria` (10 cats) with LABELS, ICONS, COLORS constants
  - `MetodoPagamento` (dinheiro/debito/credito/pix/boleto/outros)
- `src/types/finance.ts` — frontend view types:
  - `Despesa` (frontend view of `contas` — titulo, parcelamento, metodoPagamento, etc.)
  - `DespesaCategoria` (11 cats, incl. tecnologia/assinaturas)
  - `ProjetoStatus`, `PROJETO_STATUS_LABELS`
- `src/types/transactions.ts` — pagination and filter types:
  - `PaginationState`, `PaginationInfo`
  - `ContasFiltros` (for despesas table), `TransacoesFiltros` (incl. `bancoId`)
  - `ExtratoSumario` (totalReceitas, totalDespesas, saldo)
  - `DateRangePreset`

#### Key Type Relationships
```
DB contas record  → mapConta()         → Conta (types/index.ts)
                  → mapContaToDespesa() → Despesa (types/finance.ts)
DB transacoes     → mapTransacao()     → Transacao (types/index.ts)
DB bancos         → mapBanco()         → Banco (types/index.ts)
DB importacoes    → mapImportacao()    → Importacao (types/index.ts)
```

### Page-by-Page Feature Summary

| Page | Route | Key Features |
|------|-------|-------------|
| `Auth.tsx` | `/auth` | Login/signup (public) |
| `Onboarding.tsx` | `/onboarding` | Initial salary & profile setup |
| `Dashboard.tsx` | `/dashboard` | Summary cards, Recharts charts, monthly evolution |
| `Despesas.tsx` | `/despesas` | Planned bills — 4 tabs: Abertas / Atrasadas / Parceladas / Pagas. Installment status badges (Em andamento/Finalizado), progress bars, payment dialog auto-increments `parcelasPagas`, links payment to real `transacoes` |
| `Projetos.tsx` | `/projetos` | Project CRUD with Markdown description (react-markdown + remark-gfm + @tailwindcss/typography prose). Item toggle calls `api.toggleProjetoItemCompleted()` + `updateProjetoItemLocal()` (avoids full re-insert race) |
| `Calendario.tsx` | `/calendario` | Calendar view of despesas by due date |
| `Transacoes.tsx` | `/transacoes` | Real bank movements — paginated table, URL-driven filters including banco filter |
| `Importacao.tsx` | `/importacao` | Hosts `ImportacaoWizard` — upload CSV/OFX → review transactions → confirm to `transacoes` table |

### Component Highlights

**`src/components/importacao/ImportacaoWizard.tsx`**
- Step machine: upload → reviewing → done
- "Reviewing" step: bank selector (uses `useBancos`) + inline "Create new bank" mini-form
- Per-row tipo toggle (entrada/saída) via `tipoEditado` field on `ItemRevisao`
- On confirm: calls `api.confirmarImportacao()` → writes to `transacoes` (NOT `contas`)

**`src/components/transacoes/FiltrosBar.tsx`**
- Filters: date range (presets), tipo (entrada/saída/todas), categories, payment methods, project, **banco**
- Bank filter renders only when `bancos.length > 0` (requires migration_v3 applied)

**`src/components/transacoes/TabelaTransacoes.tsx`**
- Paginated table with inline edit/delete dialogs
- Shows bank name per transaction when `bancoId` is present

**`src/components/transferencias/TransferenciaDialog.tsx`**
- Creates internal transfers as two linked `contas` records with `isTransferencia: true`
- Uses `createTransferencia()` in AppContext / api

### UI Stack

- **Components:** shadcn-ui primitives in `src/components/ui/` (Radix UI based, 50+ components)
- **Styling:** Tailwind CSS with CSS variable–based theming (dark mode via `.dark` class)
  - All pages use `max-w-5xl mx-auto` for consistent layout width
- **Typography/Markdown:** `react-markdown` + `remark-gfm` + `@tailwindcss/typography` (`prose` classes)
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Notifications:** Sonner (`toast()`) + shadcn Toaster (both active)
- **Forms:** React Hook Form + Zod + `@hookform/resolvers`
- **Data Fetching:** `@tanstack/react-query` v5 for server-side paginated state (transacoes, bancos)
- **File Upload:** react-dropzone

### Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

The Supabase client is initialized in `src/lib/supabase.ts` and used exclusively via `ApiService`.

### Path Alias

`@/` maps to `./src/` — use this for all imports.

### Important Patterns & Pitfalls

1. **`updateProjeto()` does full DELETE+INSERT of all `projeto_itens`** — never use it for toggling a single item. Use `api.toggleProjetoItemCompleted(itemId, val)` + `updateProjetoItemLocal(projetoId, itemId, changes)` instead.

2. **`confirmarImportacao` writes to `transacoes`** (not `contas`) — imported bank statements are real transactions, not planned expenses.

3. **`deleteImportacao()` must delete from `transacoes`** (not `contas`) to clean up correctly.

4. **Transfers (`isTransferencia: true`)** are excluded from totals in `useDespesas` to avoid inflating expense counts. `despesasReais` = all contas minus transfers.

5. **Bank filter in Transacoes** only appears if `bancos.length > 0`, which requires `migration_v3.sql` applied in Supabase.

6. **Parcelamento** (`parcelada`, `total_parcelas`, `parcelas_pagas`) requires `migration_v4.sql` applied. After paying an installment, `parcelasPagas` is incremented via `updateDespesa(id, { parcelasPagas: novaParcelasPagas })`.

7. **React Query keys**: `['bancos']` for bank accounts, `['transacoes', filters, pagination]` for paginated extract.
