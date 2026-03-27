import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Banco, BancoTipo } from '@/types';

export function useBancos() {
  const qc = useQueryClient();

  const { data: bancos = [], isLoading } = useQuery<Banco[]>({
    queryKey: ['bancos'],
    queryFn: () => api.getBancos(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { nome: string; tipo: BancoTipo }) => api.createBanco(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bancos'] }),
  });

  return {
    bancos,
    isLoading,
    createBanco: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
