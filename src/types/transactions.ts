import type { ContaCategoria, MetodoPagamento, TransacaoTipo } from '@/types';

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface PaginationInfo extends PaginationState {
  totalCount: number;
  totalPages: number;
}

// Filtros para a tabela contas (Despesas — mantido para compatibilidade)
export interface ContasFiltros {
  dataInicio?: string;
  dataFim?: string;
  categorias?: ContaCategoria[];
  metodosPagamento?: MetodoPagamento[];
  status?: 'paga' | 'pendente' | 'todas';
  projetoId?: string;
  somenteTransferencias?: boolean;
  excluirTransferencias?: boolean;
  busca?: string;
}

// Filtros para a tabela transacoes (Extrato Real)
export interface TransacoesFiltros {
  dataInicio?: string;      // ISO date YYYY-MM-DD
  dataFim?: string;         // ISO date YYYY-MM-DD
  tipo?: TransacaoTipo | 'todas';
  categorias?: ContaCategoria[];
  metodosPagamento?: MetodoPagamento[];
  projetoId?: string;
  projectItemId?: string;
  expenseId?: string;
  excluirTransferencias?: boolean;
  busca?: string;
  bancoId?: string;
}

export interface ExtratoSumario {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
}

export type DateRangePreset = 'mes_atual' | 'mes_passado' | 'ano_atual' | 'personalizado';
