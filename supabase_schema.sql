-- SQL para executar no "SQL Editor" do projeto Supabase para criar as tabelas e habilitar segurança

-- Ativar extensões úteis (opcional mas recomendado)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-------------------------------------------------------------------------------------
-- 1. TABELA DE PROFILES (ESTENSAO DE AUTH.USERS)
-------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users not null primary key,
  name text,
  phone text,
  salario_bruto numeric(10,2) default 0,
  salario_liquido numeric(10,2) default 0,
  onboarding_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuários podem criar seu próprio perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-------------------------------------------------------------------------------------
-- 1.5. TABELA DE CATEGORIAS
-------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categorias (
  id text primary key,
  nome text not null
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos podem ler categorias" ON public.categorias FOR SELECT USING (true);

-- Insert DEFAULT Categories
INSERT INTO public.categorias (id, nome) VALUES 
  ('moradia', 'Moradia'),
  ('alimentacao', 'Alimentação'),
  ('transporte', 'Transporte'),
  ('saude', 'Saúde'),
  ('educacao', 'Educação'),
  ('lazer', 'Lazer'),
  ('vestuario', 'Vestuário'),
  ('servicos', 'Serviços'),
  ('investimento', 'Investimento'),
  ('outros', 'Outros')
ON CONFLICT DO NOTHING;

-- Trigger para criar perfil automaticamente quando um usuário se cadastrar (opcional, ou podemos criar da aplicação)
-- CREATE OR REPLACE FUNCTION public.handle_new_user() 
-- RETURNS trigger AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, name)
--   VALUES (new.id, new.raw_user_meta_data->>'name');
--   RETURN new;
-- END;
-- $$ language plpgsql security definer;
-- 
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-------------------------------------------------------------------------------------
-- 2. TABELA DE DESPESAS/CONTAS
-------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  descricao text not null,
  categoria text,
  valor numeric(10,2) not null,
  tipo text, -- fixa ou variavel
  dia_vencimento integer,
  paga boolean default false,
  mes integer,
  ano integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver próprias contas" ON public.contas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Criar próprias contas" ON public.contas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar próprias contas" ON public.contas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Deletar próprias contas" ON public.contas FOR DELETE USING (auth.uid() = user_id);

-------------------------------------------------------------------------------------
-- 3. TABELA DE INVESTIMENTOS
-------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investimentos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  nome text not null,
  tipo text,
  valor numeric(10,2) not null,
  rentabilidade numeric(5,2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.investimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver próprios investimentos" ON public.investimentos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Criar próprios investimentos" ON public.investimentos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar próprios investimentos" ON public.investimentos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Deletar próprios investimentos" ON public.investimentos FOR DELETE USING (auth.uid() = user_id);

-------------------------------------------------------------------------------------
-- 4. TABELA DE PROJETOS E PROJETO_ITENS
-------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projetos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  nome text not null,
  descricao text,
  orcamento numeric(10,2),
  status text default 'planejado',
  data_inicio date,
  data_fim date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver próprios projetos" ON public.projetos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Criar próprios projetos" ON public.projetos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar próprios projetos" ON public.projetos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Deletar próprios projetos" ON public.projetos FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.projeto_itens (
  id uuid default uuid_generate_v4() primary key,
  projeto_id uuid references public.projetos on delete cascade not null,
  descricao text not null,
  valor_estimado numeric(10,2) not null,
  categoria text,
  conta_id uuid references public.contas on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.projeto_itens ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para itens com base no dono do projeto
CREATE POLICY "Ver itens projetos" ON public.projeto_itens FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projetos p WHERE p.id = projeto_id AND p.user_id = auth.uid())
);
CREATE POLICY "Criar itens projetos" ON public.projeto_itens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projetos p WHERE p.id = projeto_id AND p.user_id = auth.uid())
);
CREATE POLICY "Atualizar itens projetos" ON public.projeto_itens FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projetos p WHERE p.id = projeto_id AND p.user_id = auth.uid())
);
CREATE POLICY "Deletar itens projetos" ON public.projeto_itens FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projetos p WHERE p.id = projeto_id AND p.user_id = auth.uid())
);

-------------------------------------------------------------------------------------
-- 5. TABELA DE ANALISES (Geradas por AI)
-------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analises (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  mes integer not null,
  ano integer not null,
  classificacao text,
  pontuacao integer,
  recomendacoes jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.analises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver próprias análises" ON public.analises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Criar próprias análises" ON public.analises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar próprias análises" ON public.analises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Deletar próprias análises" ON public.analises FOR DELETE USING (auth.uid() = user_id);

-------------------------------------------------------------------------------------
-- MIGRATION: Novos módulos (Transações, Transferências, Importação, Projetos)
-- Execute apenas se o banco já existe. Para banco novo, as seções abaixo já
-- incluem os campos — basta rodar o schema completo do início.
-------------------------------------------------------------------------------------

-------------------------------------------------------------------------------------
-- 6. NOVAS COLUNAS NA TABELA contas
-------------------------------------------------------------------------------------

-- Meio de pagamento (pix, debito, credito, boleto, dinheiro, ted, doc, outros)
ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS metodo_pagamento text DEFAULT 'outros';

-- Data efetiva do pagamento (opcional, diferente do dia de vencimento)
ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS data_pagamento date;

-- Projeto vinculado (opcional)
ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS projeto_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL;

-- Flag de transferência interna (não conta nos totais de gastos)
ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS is_transferencia boolean DEFAULT false NOT NULL;

-- FK auto-referência para par de transferência (débito ↔ crédito)
ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS transferencia_par_id uuid REFERENCES public.contas(id) ON DELETE SET NULL;

-- Rastreabilidade: qual importação gerou essa transação
ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS importacao_id uuid; -- FK adicionada após criar tabela importacoes abaixo

-- Índices de performance para os filtros e joins mais comuns
CREATE INDEX IF NOT EXISTS idx_contas_user_mes_ano ON public.contas (user_id, mes, ano);
CREATE INDEX IF NOT EXISTS idx_contas_is_transferencia ON public.contas (is_transferencia);
CREATE INDEX IF NOT EXISTS idx_contas_projeto_id ON public.contas (projeto_id);
CREATE INDEX IF NOT EXISTS idx_contas_importacao_id ON public.contas (importacao_id);
CREATE INDEX IF NOT EXISTS idx_contas_metodo_pagamento ON public.contas (metodo_pagamento);

-------------------------------------------------------------------------------------
-- 7. TABELA DE IMPORTAÇÕES DE EXTRATOS
-------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.importacoes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  nome_arquivo text NOT NULL,
  status text NOT NULL DEFAULT 'processando',
    -- processando | revisao_pendente | concluido | erro
  total_transacoes integer DEFAULT 0,
  total_importadas integer DEFAULT 0,
  total_duplicatas integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver próprias importações" ON public.importacoes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Criar próprias importações" ON public.importacoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar próprias importações" ON public.importacoes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Deletar próprias importações" ON public.importacoes
  FOR DELETE USING (auth.uid() = user_id);

-- Agora que importacoes existe, adiciona a FK em contas
ALTER TABLE public.contas
  ADD CONSTRAINT fk_contas_importacao
    FOREIGN KEY (importacao_id)
    REFERENCES public.importacoes(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_importacoes_user_id ON public.importacoes (user_id);
CREATE INDEX IF NOT EXISTS idx_importacoes_created_at ON public.importacoes (created_at DESC);

-------------------------------------------------------------------------------------
-- REFERÊNCIA: Schema completo de contas (com todos os campos, para banco novo)
-------------------------------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS public.contas (
--   id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
--   user_id             uuid REFERENCES auth.users NOT NULL,
--   descricao           text NOT NULL,
--   categoria           text,
--   valor               numeric(10,2) NOT NULL,
--   tipo                text,                                   -- fixa | variavel
--   dia_vencimento      integer,
--   paga                boolean DEFAULT false,
--   mes                 integer,
--   ano                 integer,
--   metodo_pagamento    text DEFAULT 'outros',                  -- NOVO
--   data_pagamento      date,                                   -- NOVO
--   projeto_id          uuid REFERENCES public.projetos(id)
--                         ON DELETE SET NULL,                   -- NOVO
--   is_transferencia    boolean DEFAULT false NOT NULL,         -- NOVO
--   transferencia_par_id uuid REFERENCES public.contas(id)
--                         ON DELETE SET NULL,                   -- NOVO
--   importacao_id       uuid REFERENCES public.importacoes(id)
--                         ON DELETE SET NULL,                   -- NOVO
--   created_at          timestamp with time zone
--                         DEFAULT timezone('utc'::text, now()) NOT NULL
-- );
