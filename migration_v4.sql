-- Migration v4: Add installment (parcelamento) columns to contas

ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS parcelada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_parcelas integer,
  ADD COLUMN IF NOT EXISTS parcelas_pagas integer NOT NULL DEFAULT 0;
