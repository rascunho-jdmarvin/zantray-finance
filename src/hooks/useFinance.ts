import { useCallback, useMemo } from 'react';
import type { Despesa, Projeto } from '@/types/finance';
import { useApp } from '@/contexts/AppContext';
import type { Conta } from '@/types';

// Translator from Conta (DB) to Despesa (Frontend)
function mapContaToDespesa(conta: Conta): Despesa {
  const mesFormatado = String(conta.mes).padStart(2, '0');
  const diaFormatado = String(conta.diaVencimento).padStart(2, '0');

  return {
    id: conta.id,
    titulo: conta.descricao,
    valor: conta.valor,
    tipo: conta.tipo,
    categoria: conta.categoria as Despesa['categoria'],
    dataVencimento: `${conta.ano}-${mesFormatado}-${diaFormatado}`,
    paga: conta.paga,
    parcelada: conta.parcelada ?? false,
    totalParcelas: conta.totalParcelas,
    parcelasPagas: conta.parcelasPagas ?? 0,
    parcelaAtual: conta.parcelada ? (conta.parcelasPagas ?? 0) + 1 : undefined,
    projetoId: conta.projetoId,
    metodoPagamento: conta.metodoPagamento,
    dataPagamento: conta.dataPagamento,
    isTransferencia: conta.isTransferencia,
    importacaoId: conta.importacaoId,
  };
}

export function useDespesas() {
  const { contas, addConta, updateConta, deleteConta, togglePaga: contextTogglePaga } = useApp();

  // Todas as despesas incluindo transferências (para a tabela completa)
  const despesas = useMemo(() => contas.map(mapContaToDespesa), [contas]);

  // Apenas despesas reais (excluindo transferências internas) para totais
  const despesasReais = useMemo(
    () => despesas.filter(d => !d.isTransferencia),
    [despesas]
  );

  const addDespesa = useCallback(async (d: Omit<Despesa, 'id'>) => {
    const dataPartes = d.dataVencimento.split('-');
    const startDia = parseInt(dataPartes[2]);
    const startMes = parseInt(dataPartes[1]);
    const startAno = parseInt(dataPartes[0]);
    const hoje = new Date();
    const hojeAno = hoje.getFullYear();
    const hojeMes = hoje.getMonth() + 1;

    if (d.parcelada && d.totalParcelas && d.totalParcelas > 1) {
      // Cria TODAS as parcelas, retroagindo meses passados (paga: true) e avançando futuros
      const grupoId = crypto.randomUUID();
      const parcelasPagasInitial = d.parcelasPagas ?? 0;
      // Mês real do início: recua parcelasPagasInitial meses a partir da data escolhida
      const inicioOffset = (startMes - 1) - parcelasPagasInitial;
      const mesInicio = ((inicioOffset % 12) + 12) % 12 + 1;
      const anoInicio = startAno + Math.floor(inicioOffset / 12);
      const tasks = Array.from({ length: d.totalParcelas }, (_, i) => {
        const totalMesesOffset = (mesInicio - 1) + i;
        const mesParcela = (totalMesesOffset % 12) + 1;
        const anoParcela = anoInicio + Math.floor(totalMesesOffset / 12);
        const isPast = anoParcela < hojeAno || (anoParcela === hojeAno && mesParcela < hojeMes);
        return addConta({
          descricao: d.titulo,
          categoria: d.categoria as Conta['categoria'],
          valor: d.valor,
          tipo: d.tipo,
          diaVencimento: startDia,
          paga: isPast,
          mes: mesParcela,
          ano: anoParcela,
          parcelada: true,
          totalParcelas: d.totalParcelas,
          parcelasPagas: i,
          metodoPagamento: d.metodoPagamento,
          projetoId: d.projetoId,
          isTransferencia: false,
          parcelamentoGrupoId: grupoId,
        } as Omit<Conta, 'id'>);
      });
      await Promise.all(tasks);
    } else {
      await addConta({
        descricao: d.titulo,
        categoria: d.categoria as Conta['categoria'],
        valor: d.valor,
        tipo: d.tipo,
        diaVencimento: startDia,
        paga: d.paga,
        mes: startMes,
        ano: startAno,
        parcelada: d.parcelada ?? false,
        totalParcelas: d.totalParcelas,
        parcelasPagas: d.parcelasPagas ?? 0,
        metodoPagamento: d.metodoPagamento,
        dataPagamento: d.dataPagamento,
        projetoId: d.projetoId,
        isTransferencia: d.isTransferencia ?? false,
      });
    }
  }, [addConta]);

  const updateLocalDespesa = useCallback(async (id: string, d: Partial<Despesa>) => {
    const updatePayload: Partial<Conta> = {};
    if (d.titulo !== undefined) updatePayload.descricao = d.titulo;
    if (d.categoria !== undefined) updatePayload.categoria = d.categoria as Conta['categoria'];
    if (d.valor !== undefined) updatePayload.valor = d.valor;
    if (d.tipo !== undefined) updatePayload.tipo = d.tipo;
    if (d.dataVencimento !== undefined) {
      const dataPartes = d.dataVencimento.split('-');
      updatePayload.diaVencimento = parseInt(dataPartes[2]);
      updatePayload.mes = parseInt(dataPartes[1]);
      updatePayload.ano = parseInt(dataPartes[0]);
    }
    if (d.paga !== undefined) updatePayload.paga = d.paga;
    if (d.parcelada !== undefined) updatePayload.parcelada = d.parcelada;
    if (d.totalParcelas !== undefined) updatePayload.totalParcelas = d.totalParcelas;
    if (d.parcelasPagas !== undefined) updatePayload.parcelasPagas = d.parcelasPagas;
    if (d.metodoPagamento !== undefined) updatePayload.metodoPagamento = d.metodoPagamento;
    if (d.dataPagamento !== undefined) updatePayload.dataPagamento = d.dataPagamento;
    if (d.projetoId !== undefined) updatePayload.projetoId = d.projetoId;
    if (d.isTransferencia !== undefined) updatePayload.isTransferencia = d.isTransferencia;

    await updateConta(id, updatePayload);
  }, [updateConta]);

  const removeDespesa = useCallback((id: string) => deleteConta(id), [deleteConta]);
  const togglePaga = useCallback((id: string) => contextTogglePaga(id), [contextTogglePaga]);

  // Totais excluem transferências internas para não inflar os gastos
  const totalMes = useMemo(() => despesasReais.reduce((s, d) => s + d.valor, 0), [despesasReais]);
  const totalPago = useMemo(() => despesasReais.filter(d => d.paga).reduce((s, d) => s + d.valor, 0), [despesasReais]);
  const totalPendente = useMemo(() => despesasReais.filter(d => !d.paga).reduce((s, d) => s + d.valor, 0), [despesasReais]);

  const fixas = useMemo(() => despesasReais.filter(d => d.tipo === 'fixa' && !d.parcelada), [despesasReais]);
  const variaveis = useMemo(() => despesasReais.filter(d => d.tipo === 'variavel' && !d.parcelada), [despesasReais]);
  const parceladas = useMemo(() => despesasReais.filter(d => d.parcelada), [despesasReais]);

  const proximasVencer = useMemo(() => {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 86400000);
    return despesasReais
      .filter(d => !d.paga && new Date(d.dataVencimento) >= now && new Date(d.dataVencimento) <= in7days)
      .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
  }, [despesasReais]);

  const parcelasProjetadas = useMemo(() => {
    const result: Despesa[] = [];
    despesasReais.filter(d => d.parcelada && d.totalParcelas && d.parcelasPagas !== undefined).forEach(d => {
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
  }, [despesasReais]);

  return {
    despesas,
    despesasReais,
    addDespesa,
    updateDespesa: updateLocalDespesa,
    deleteDespesa: removeDespesa,
    togglePaga,
    totalMes, totalPago, totalPendente,
    fixas, variaveis, parceladas, proximasVencer, parcelasProjetadas,
  };
}

export function useProjetos() {
  const { projetos, addProjeto: contextAdd, updateProjeto: contextUpdate, deleteProjeto: contextDelete } = useApp();

  const addProjeto = useCallback((p: Omit<Projeto, 'id' | 'createdAt'>) => {
    contextAdd(p as never);
  }, [contextAdd]);

  const updateProjeto = useCallback((id: string, data: Partial<Projeto>) => {
    contextUpdate(id, data as never);
  }, [contextUpdate]);

  const deleteProjeto = useCallback((id: string) => {
    contextDelete(id);
  }, [contextDelete]);

  return { projetos: projetos as unknown as Projeto[], addProjeto, updateProjeto, deleteProjeto };
}

// ─── Utilitário anti-duplicidade ──────────────────────
export function calculateTotals(despesas: Despesa[]) {
  const real = despesas.filter(d => !d.isTransferencia);
  return {
    totalReceitas: 0, // receitas virão de outra entidade futuramente
    totalDespesas: real.reduce((s, d) => s + d.valor, 0),
    totalTransferencias: despesas.filter(d => d.isTransferencia).reduce((s, d) => s + d.valor, 0),
    totalPago: real.filter(d => d.paga).reduce((s, d) => s + d.valor, 0),
    totalPendente: real.filter(d => !d.paga).reduce((s, d) => s + d.valor, 0),
  };
}
