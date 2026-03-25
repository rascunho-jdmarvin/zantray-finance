import { useState, useCallback, useMemo } from 'react';
import type { Despesa, Projeto } from '@/types/finance';
import { MOCK_DESPESAS, MOCK_PROJETOS } from '@/data/mockData';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function useDespesas() {
  const [despesas, setDespesas] = useState<Despesa[]>(MOCK_DESPESAS);

  const addDespesa = useCallback((d: Omit<Despesa, 'id'>) => {
    setDespesas(prev => [...prev, { ...d, id: generateId() }]);
  }, []);

  const updateDespesa = useCallback((id: string, data: Partial<Despesa>) => {
    setDespesas(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
  }, []);

  const deleteDespesa = useCallback((id: string) => {
    setDespesas(prev => prev.filter(d => d.id !== id));
  }, []);

  const togglePaga = useCallback((id: string) => {
    setDespesas(prev => prev.map(d => d.id === id ? { ...d, paga: !d.paga } : d));
  }, []);

  const totalMes = useMemo(() => despesas.reduce((s, d) => s + d.valor, 0), [despesas]);
  const totalPago = useMemo(() => despesas.filter(d => d.paga).reduce((s, d) => s + d.valor, 0), [despesas]);
  const totalPendente = useMemo(() => despesas.filter(d => !d.paga).reduce((s, d) => s + d.valor, 0), [despesas]);

  const fixas = useMemo(() => despesas.filter(d => d.tipo === 'fixa' && !d.parcelada), [despesas]);
  const variaveis = useMemo(() => despesas.filter(d => d.tipo === 'variavel' && !d.parcelada), [despesas]);
  const parceladas = useMemo(() => despesas.filter(d => d.parcelada), [despesas]);

  const proximasVencer = useMemo(() => {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 86400000);
    return despesas
      .filter(d => !d.paga && new Date(d.dataVencimento) >= now && new Date(d.dataVencimento) <= in7days)
      .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
  }, [despesas]);

  // Generate future installments for calendar view
  const parcelasProjetadas = useMemo(() => {
    const result: Despesa[] = [];
    despesas.filter(d => d.parcelada && d.totalParcelas && d.parcelasPagas !== undefined).forEach(d => {
      const restantes = d.totalParcelas! - (d.parcelasPagas || 0);
      const baseDate = new Date(d.dataVencimento);
      for (let i = 0; i < restantes; i++) {
        const dt = new Date(baseDate);
        dt.setMonth(dt.getMonth() + i);
        result.push({
          ...d,
          id: `${d.id}-proj-${i}`,
          dataVencimento: dt.toISOString().split('T')[0],
          parcelaAtual: (d.parcelasPagas || 0) + 1 + i,
          paga: i === 0 ? d.paga : false,
        });
      }
    });
    return result;
  }, [despesas]);

  return {
    despesas, addDespesa, updateDespesa, deleteDespesa, togglePaga,
    totalMes, totalPago, totalPendente,
    fixas, variaveis, parceladas, proximasVencer, parcelasProjetadas,
  };
}

export function useProjetos() {
  const [projetos, setProjetos] = useState<Projeto[]>(MOCK_PROJETOS);

  const addProjeto = useCallback((p: Omit<Projeto, 'id' | 'createdAt'>) => {
    setProjetos(prev => [...prev, { ...p, id: generateId(), createdAt: new Date().toISOString() }]);
  }, []);

  const updateProjeto = useCallback((id: string, data: Partial<Projeto>) => {
    setProjetos(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  }, []);

  const deleteProjeto = useCallback((id: string) => {
    setProjetos(prev => prev.filter(p => p.id !== id));
  }, []);

  return { projetos, addProjeto, updateProjeto, deleteProjeto };
}
