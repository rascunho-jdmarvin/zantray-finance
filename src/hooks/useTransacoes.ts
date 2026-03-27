import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { api } from '@/services/api';
import type { TransacoesFiltros, PaginationState } from '@/types/transactions';
import type { ContaCategoria, MetodoPagamento, TransacaoTipo } from '@/types';

const PAGE_SIZE = 20;

function parseFiltrosFromParams(params: URLSearchParams): TransacoesFiltros {
  const categorias = params.get('categorias');
  const metodos = params.get('metodos');
  const tipo = params.get('tipo') as TransacaoTipo | 'todas' | null;

  return {
    dataInicio: params.get('inicio') ?? undefined,
    dataFim: params.get('fim') ?? undefined,
    tipo: tipo ?? 'todas',
    categorias: categorias ? (categorias.split(',') as ContaCategoria[]) : undefined,
    metodosPagamento: metodos ? (metodos.split(',') as MetodoPagamento[]) : undefined,
    projetoId: params.get('projeto') ?? undefined,
    excluirTransferencias: params.get('transferencias') !== '1',
    busca: params.get('busca') ?? undefined,
    bancoId: params.get('banco') ?? undefined,
  };
}

export function filtrosToParams(filtros: TransacoesFiltros): Record<string, string> {
  const p: Record<string, string> = {};
  if (filtros.dataInicio) p.inicio = filtros.dataInicio;
  if (filtros.dataFim) p.fim = filtros.dataFim;
  if (filtros.tipo && filtros.tipo !== 'todas') p.tipo = filtros.tipo;
  if (filtros.categorias?.length) p.categorias = filtros.categorias.join(',');
  if (filtros.metodosPagamento?.length) p.metodos = filtros.metodosPagamento.join(',');
  if (filtros.projetoId) p.projeto = filtros.projetoId;
  if (!filtros.excluirTransferencias) p.transferencias = '1';
  if (filtros.busca) p.busca = filtros.busca;
  if (filtros.bancoId) p.banco = filtros.bancoId;
  return p;
}

export function useTransacoes() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') ?? '0', 10);
  const filtros = useMemo(() => parseFiltrosFromParams(searchParams), [searchParams]);
  const pagination: PaginationState = { page, pageSize: PAGE_SIZE };

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['extrato', filtros, page],
    queryFn: () => api.getExtratoPaginado(filtros, pagination),
    placeholderData: prev => prev,
  });

  const { data: sumario } = useQuery({
    queryKey: ['extrato-sumario', filtros],
    queryFn: () => api.getExtratoSumario(filtros),
    placeholderData: prev => prev,
  });

  const setFiltros = (novosFiltros: TransacoesFiltros) => {
    const params = filtrosToParams(novosFiltros);
    setSearchParams({ ...params, page: '0' });
  };

  const setPage = (newPage: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
  };

  const clearFiltros = () => setSearchParams({ page: '0' });

  const hasActiveFiltros = useMemo(() => {
    return !!(
      filtros.dataInicio ||
      filtros.dataFim ||
      (filtros.tipo && filtros.tipo !== 'todas') ||
      filtros.categorias?.length ||
      filtros.metodosPagamento?.length ||
      filtros.projetoId ||
      filtros.busca ||
      filtros.bancoId
    );
  }, [filtros]);

  return {
    transacoes: data?.data ?? [],
    paginacao: data?.pagination,
    sumario: sumario ?? { totalReceitas: 0, totalDespesas: 0, saldo: 0 },
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
