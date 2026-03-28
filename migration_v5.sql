-- ============================================================
-- MIGRAÇÃO V5 — Compartilhamento de Projetos + Parcelamento Grupo
-- Execute no "SQL Editor" do projeto Supabase
-- SEGURO: Não apaga dados existentes (sem DROP TABLE)
-- ============================================================

-------------------------------------------------------------------------------------
-- 1. parcelamento_grupo_id EM contas
--    Agrupa todas as parcelas de um mesmo parcelamento para facilitar deleção em lote
-------------------------------------------------------------------------------------
ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS parcelamento_grupo_id uuid;

CREATE INDEX IF NOT EXISTS idx_contas_parcelamento_grupo_id
  ON public.contas (parcelamento_grupo_id);

-------------------------------------------------------------------------------------
-- 2. TABELA projeto_compartilhamentos
--    Permite que um usuário compartilhe um projeto (somente leitura) com outro
--    Privacidade: contas, transacoes, bancos continuam protegidos por RLS user_id
-------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projeto_compartilhamentos (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  projeto_id    uuid REFERENCES public.projetos(id) ON DELETE CASCADE NOT NULL,
  owner_id      uuid REFERENCES auth.users NOT NULL,
  shared_with_id uuid REFERENCES auth.users NOT NULL,
  created_at    timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(projeto_id, shared_with_id)
);

ALTER TABLE public.projeto_compartilhamentos ENABLE ROW LEVEL SECURITY;

-- Dono gerencia; convidado pode ver que tem acesso
CREATE POLICY "Ver compartilhamentos"    ON public.projeto_compartilhamentos
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);
CREATE POLICY "Criar compartilhamentos" ON public.projeto_compartilhamentos
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Deletar compartilhamentos" ON public.projeto_compartilhamentos
  FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_projeto_compartilhamentos_projeto_id
  ON public.projeto_compartilhamentos (projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_compartilhamentos_shared_with
  ON public.projeto_compartilhamentos (shared_with_id);

-------------------------------------------------------------------------------------
-- 3. ATUALIZAR RLS EM projetos PARA INCLUIR COMPARTILHADOS
--    Remove a política SELECT original e cria uma que inclui compartilhados
-------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Ver próprios projetos" ON public.projetos;

CREATE POLICY "Ver projetos (próprios e compartilhados)" ON public.projetos
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.projeto_compartilhamentos pc
      WHERE pc.projeto_id = id AND pc.shared_with_id = auth.uid()
    )
  );

-------------------------------------------------------------------------------------
-- 4. ATUALIZAR RLS EM projeto_itens PARA INCLUIR COMPARTILHADOS
--    Remove política SELECT original e cria uma que permite leitura por convidados
-------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Ver itens projetos" ON public.projeto_itens;

CREATE POLICY "Ver itens projetos (próprios e compartilhados)" ON public.projeto_itens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projetos p WHERE p.id = projeto_id AND p.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.projeto_compartilhamentos pc
      WHERE pc.projeto_id = projeto_id AND pc.shared_with_id = auth.uid()
    )
  );

-------------------------------------------------------------------------------------
-- 5. FUNÇÃO RPC SEGURA: buscar user_id por email
--    Usada para compartilhar projeto via email sem expor auth.users publicamente
-------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email;
  RETURN v_id;
END;
$$;
