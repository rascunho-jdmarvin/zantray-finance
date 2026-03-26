import type { ContaCategoria, MetodoPagamento } from '@/types';

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface PaginationInfo extends PaginationState {
  totalCount: number;
  totalPages: number;
}

export interface TransacoesFiltros {
  dataInicio?: string;      // ISO date YYYY-MM-DD
  dataFim?: string;         // ISO date YYYY-MM-DD
  categorias?: ContaCategoria[];
  metodosPagamento?: MetodoPagamento[];
  status?: 'paga' | 'pendente' | 'todas';
  projetoId?: string;
  somenteTransferencias?: boolean;
  excluirTransferencias?: boolean;
  busca?: string;
}

export type DateRangePreset = 'mes_atual' | 'mes_passado' | 'ano_atual' | 'personalizado';
