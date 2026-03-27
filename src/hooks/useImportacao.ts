import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import type { TransacaoImportada, Transacao, TransacaoTipo } from '@/types';

export type ImportStep = 'idle' | 'uploading' | 'reviewing' | 'confirming' | 'done';

export interface ItemRevisao extends TransacaoImportada {
  aprovado: boolean;
  // Campos editáveis pelo usuário na tela de revisão
  descricaoEditada?: string;
  categoriaEditada?: TransacaoImportada['categoria'];
  tipoEditado?: TransacaoTipo; // override entrada/saida
  projetoId?: string;
  isTransferencia?: boolean;
}

interface UseImportacaoState {
  step: ImportStep;
  importacaoId: string | null;
  itens: ItemRevisao[];
  arquivo: File | null;
  resultado: { imported: number; skipped: number } | null;
  bancoId: string | null;
}

export function useImportacao(onSuccess?: () => void) {
  const [state, setState] = useState<UseImportacaoState>({
    step: 'idle',
    importacaoId: null,
    itens: [],
    arquivo: null,
    resultado: null,
    bancoId: null,
  });

  const iniciar = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, step: 'uploading', arquivo: file }));
    try {
      const { importacaoId, transacoes } = await api.iniciarImportacao(file);
      setState(prev => ({
        ...prev,
        step: 'reviewing',
        importacaoId,
        itens: transacoes.map(t => ({ ...t, aprovado: !t.possivelDuplicata })),
      }));
    } catch (err) {
      toast.error('Erro ao processar o arquivo. Verifique se é um PDF ou CSV válido.');
      setState(prev => ({ ...prev, step: 'idle', arquivo: null }));
      console.error(err);
    }
  }, []);

  const aprovarItem = useCallback((index: number, aprovado: boolean) => {
    setState(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => i === index ? { ...item, aprovado } : item),
    }));
  }, []);

  const editarItem = useCallback((index: number, changes: Partial<ItemRevisao>) => {
    setState(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => i === index ? { ...item, ...changes } : item),
    }));
  }, []);

  const aprovarTodos = useCallback((aprovado: boolean) => {
    setState(prev => ({
      ...prev,
      itens: prev.itens.map(item => ({ ...item, aprovado })),
    }));
  }, []);

  const setBancoId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, bancoId: id }));
  }, []);

  const confirmar = useCallback(async () => {
    if (!state.importacaoId) return;
    setState(prev => ({ ...prev, step: 'confirming' }));

    try {
      const aprovados = state.itens.filter(i => i.aprovado);
      const transacoes: Omit<Transacao, 'id' | 'createdAt'>[] = aprovados.map(item => {
        // Normalize tipo: legacy 'fixa'/'variavel' values default to 'saida'
        const tipoFinal: TransacaoTipo =
          item.tipoEditado ??
          (item.tipo === 'entrada' ? 'entrada' : 'saida');

        return {
          descricao: item.descricaoEditada ?? item.descricao,
          categoria: item.categoriaEditada ?? item.categoria,
          valor: item.valor,
          tipo: tipoFinal,
          metodoPagamento: item.metodoPagamento,
          dataTransacao: item.data,
          expenseId: undefined,
          projectItemId: undefined,
          importacaoId: state.importacaoId!,
          bancoId: state.bancoId ?? undefined,
          isTransferencia: item.isTransferencia ?? false,
          transferenciaPar: undefined,
        };
      });

      const resultado = await api.confirmarImportacao(
        state.importacaoId,
        transacoes,
        state.bancoId ?? undefined
      );
      setState(prev => ({ ...prev, step: 'done', resultado }));
      toast.success(`${resultado.imported} transações importadas com sucesso!`);
      onSuccess?.();
    } catch (err) {
      toast.error('Erro ao salvar as transações. Tente novamente.');
      setState(prev => ({ ...prev, step: 'reviewing' }));
      console.error(err);
    }
  }, [state.importacaoId, state.itens, state.bancoId, onSuccess]);

  const reiniciar = useCallback(() => {
    setState({
      step: 'idle',
      importacaoId: null,
      itens: [],
      arquivo: null,
      resultado: null,
      bancoId: null,
    });
  }, []);

  const totalAprovados = state.itens.filter(i => i.aprovado).length;
  const totalDuplicatas = state.itens.filter(i => i.possivelDuplicata).length;

  return {
    ...state,
    totalAprovados,
    totalDuplicatas,
    iniciar,
    aprovarItem,
    editarItem,
    aprovarTodos,
    confirmar,
    reiniciar,
    setBancoId,
  };
}
