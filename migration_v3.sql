-- ============================================================
-- MIGRAÇÃO V3 — Banco (Conta Bancária), correção de importação
-- Execute no "SQL Editor" do projeto Supabase
-- SEGURO: Não apaga dados existentes (sem DROP TABLE)
-- ============================================================

-------------------------------------------------------------------------------------
-- 1. TABELA bancos (contas bancárias / cartões do usuário)
-------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bancos (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  nome       text NOT NULL,
  tipo       text NOT NULL DEFAULT 'corrente',
    -- 'corrente' | 'poupanca' | 'credito' | 'investimento'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver próprios bancos"         ON public.bancos FOR SELECT  USING       (auth.uid() = user_id);
CREATE POLICY "Criar próprios bancos"       ON public.bancos FOR INSERT  WITH CHECK  (auth.uid() = user_id);
CREATE POLICY "Atualizar próprios bancos"   ON public.bancos FOR UPDATE  USING       (auth.uid() = user_id);
CREATE POLICY "Deletar próprios bancos"     ON public.bancos FOR DELETE  USING       (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bancos_user_id ON public.bancos (user_id);

-------------------------------------------------------------------------------------
-- 2. banco_id EM transacoes
--    Cada transação pode ser vinculada ao banco de onde veio
-------------------------------------------------------------------------------------
ALTER TABLE public.transacoes
  ADD COLUMN IF NOT EXISTS banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_banco_id ON public.transacoes (banco_id);

-------------------------------------------------------------------------------------
-- 3. banco_id EM importacoes
--    Cada importação de extrato é vinculada ao banco de origem
-------------------------------------------------------------------------------------
ALTER TABLE public.importacoes
  ADD COLUMN IF NOT EXISTS banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL;
