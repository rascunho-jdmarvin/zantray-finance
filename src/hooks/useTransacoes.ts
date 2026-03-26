import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { api } from '@/services/api';
import type { TransacoesFiltros, PaginationState } from '@/types/transactions';
import type { ContaCategoria, MetodoPagamento } from '@/types';

const PAGE_SIZE = 20;

// Converte URL search params para TransacoesFiltros
function parseFiltrosFromParams(params: URLSearchParams): TransacoesFiltros {
  const categorias = params.get('categorias');
  const metodos = params.get('metodos');

  return {
    dataInicio: params.get('inicio') ?? undefined,
    dataFim: params.get('fim') ?? undefined,
    categorias: categorias ? (categorias.split(',') as ContaCategoria[]) : undefined,
    metodosPagamento: metodos ? (metodos.split(',') as MetodoPagamento[]) : undefined,
    status: (params.get('status') as TransacoesFiltros['status']) ?? 'todas',
    projetoId: params.get('projeto') ?? undefined,
    excluirTransferencias: params.get('transferencias') !== '1',
    busca: params.get('busca') ?? undefined,
  };
}

// Converte TransacoesFiltros para URL search params
export function filtrosToParams(filtros: TransacoesFiltros): Record<string, string> {
  const p: Record<string, string> = {};
  if (filtros.dataInicio) p.inicio = filtros.dataInicio;
  if (filtros.dataFim) p.fim = filtros.dataFim;
  if (filtros.categorias?.length) p.categorias = filtros.categorias.join(',');
  if (filtros.metodosPagamento?.length) p.metodos = filtros.metodosPagamento.join(',');
  if (filtros.status && filtros.status !== 'todas') p.status = filtros.status;
  if (filtros.projetoId) p.projeto = filtros.projetoId;
  if (!filtros.excluirTransferencias) p.transferencias = '1';
  if (filtros.busca) p.busca = filtros.busca;
  return p;
}

export function useTransacoes() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') ?? '0', 10);
  const filtros = useMemo(() => parseFiltrosFromParams(searchParams), [searchParams]);
  const pagination: PaginationState = { page, pageSize: PAGE_SIZE };

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['transacoes', filtros, page],
    queryFn: () => api.getTransacoesPaginadas(filtros, pagination),
    placeholderData: prev => prev, // mantém dados anteriores durante paginação
  });

  const setFiltros = (novosFiltros: TransacoesFiltros) => {
    const params = filtrosToParams(novosFiltros);
    setSearchParams({ ...params, page: '0' }); // reset para página 0 ao filtrar
  };

  const setPage = (newPage: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
  };

  const clearFiltros = () => {
    setSearchParams({ page: '0' });
  };

  const hasActiveFiltros = useMemo(() => {
    return !!(
      filtros.dataInicio ||
      filtros.dataFim ||
      filtros.categorias?.length ||
      filtros.metodosPagamento?.length ||
      (filtros.status && filtros.status !== 'todas') ||
      filtros.projetoId ||
      filtros.busca
    );
  }, [filtros]);

  return {
    transacoes: data?.data ?? [],
    paginacao: data?.pagination,
    isLoading,
    isFetching,
    error,
    filtros,
    setFiltros,
    page,
    setPage,
    clearFiltros,
    hasActiveFiltros,
    pageSize: PAGE_SIZE,
  };
}
