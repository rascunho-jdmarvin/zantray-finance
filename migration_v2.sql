-- ============================================================
-- MIGRAÇÃO V2 — Separação Previsões × Realidade
-- Execute no "SQL Editor" do projeto Supabase
-- SEGURO: Não apaga dados existentes (sem DROP TABLE)
-- ============================================================

-------------------------------------------------------------------------------------
-- 1. ADICIONAR is_completed EM projeto_itens
-------------------------------------------------------------------------------------
ALTER TABLE public.projeto_itens
  ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false NOT NULL;

-------------------------------------------------------------------------------------
-- 2. TABELA DE TRANSAÇÕES (Extrato Real — movimentação efetiva de dinheiro)
--
--    Diferença da tabela contas (Despesas/Previsões):
--    - contas  → compromissos futuros (boleto, assinatura, parcela)
--    - transacoes → o que realmente aconteceu (debitou no cartão, pix, etc.)
-------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transacoes (
  id                   uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id              uuid REFERENCES auth.users NOT NULL,
  descricao            text NOT NULL,
  valor                numeric(10,2) NOT NULL,
  tipo                 text NOT NULL DEFAULT 'saida',   -- 'entrada' | 'saida'
  categoria            text DEFAULT 'outros',
  metodo_pagamento     text DEFAULT 'outros',
  data_transacao       date NOT NULL,

  -- Relacionamentos opcionais
  expense_id           uuid REFERENCES public.contas(id) ON DELETE SET NULL,
  project_item_id      uuid REFERENCES public.projeto_itens(id) ON DELETE SET NULL,
  importacao_id        uuid REFERENCES public.importacoes(id) ON DELETE SET NULL,

  -- Suporte a transferências internas
  is_transferencia     boolean DEFAULT false NOT NULL,
  transferencia_par_id uuid,  -- FK auto-referência adicionada abaixo

  created_at           timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- FK auto-referência (adicionada separadamente para evitar erro de ordem de criação)
ALTER TABLE public.transacoes
  ADD CONSTRAINT fk_transacoes_par
    FOREIGN KEY (transferencia_par_id)
    REFERENCES public.transacoes(id)
    ON DELETE SET NULL;

-------------------------------------------------------------------------------------
-- 3. RLS PARA transacoes
-------------------------------------------------------------------------------------
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver próprias transações"    ON public.transacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Criar próprias transações"  ON public.transacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar próprias transações" ON public.transacoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Deletar próprias transações"   ON public.transacoes FOR DELETE USING (auth.uid() = user_id);

-------------------------------------------------------------------------------------
-- 4. ÍNDICES DE PERFORMANCE
-------------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transacoes_user_id        ON public.transacoes (user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data           ON public.transacoes (data_transacao DESC);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo           ON public.transacoes (tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria      ON public.transacoes (categoria);
CREATE INDEX IF NOT EXISTS idx_transacoes_metodo         ON public.transacoes (metodo_pagamento);
CREATE INDEX IF NOT EXISTS idx_transacoes_expense_id     ON public.transacoes (expense_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_project_item   ON public.transacoes (project_item_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_importacao_id  ON public.transacoes (importacao_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_user_data      ON public.transacoes (user_id, data_transacao DESC);

-------------------------------------------------------------------------------------
-- REFERÊNCIA: Schema completo de transacoes (para banco novo)
-------------------------------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS public.transacoes (
--   id                   uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
--   user_id              uuid REFERENCES auth.users NOT NULL,
--   descricao            text NOT NULL,
--   valor                numeric(10,2) NOT NULL,
--   tipo                 text NOT NULL DEFAULT 'saida',
--   categoria            text DEFAULT 'outros',
--   metodo_pagamento     text DEFAULT 'outros',
--   data_transacao       date NOT NULL,
--   expense_id           uuid REFERENCES public.contas(id) ON DELETE SET NULL,
--   project_item_id      uuid REFERENCES public.projeto_itens(id) ON DELETE SET NULL,
--   importacao_id        uuid REFERENCES public.importacoes(id) ON DELETE SET NULL,
--   is_transferencia     boolean DEFAULT false NOT NULL,
--   transferencia_par_id uuid REFERENCES public.transacoes(id) ON DELETE SET NULL,
--   created_at           timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
-- );
