import { supabase } from '@/lib/supabase';
import type { Banco, BancoTipo, Conta, Importacao, TransacaoImportada, Transacao } from '@/types';
import type {
  TransacoesFiltros, ContasFiltros,
  PaginationState, PaginationInfo, ExtratoSumario,
} from '@/types/transactions';

// ─── Helpers ────────────────────────────────────────
function mapTransacao(r: Record<string, unknown>): Transacao {
  return {
    id: r.id as string,
    descricao: r.descricao as string,
    valor: r.valor as number,
    tipo: (r.tipo as Transacao['tipo']) ?? 'saida',
    categoria: (r.categoria as Transacao['categoria']) ?? 'outros',
    metodoPagamento: (r.metodo_pagamento as Transacao['metodoPagamento']) ?? 'outros',
    dataTransacao: r.data_transacao as string,
    expenseId: (r.expense_id as string) ?? undefined,
    projectItemId: (r.project_item_id as string) ?? undefined,
    importacaoId: (r.importacao_id as string) ?? undefined,
    bancoId: (r.banco_id as string) ?? undefined,
    isTransferencia: (r.is_transferencia as boolean) ?? false,
    transferenciaPar: (r.transferencia_par_id as string) ?? undefined,
    createdAt: r.created_at as string,
  };
}

function mapConta(c: Record<string, unknown>): Conta {
  return {
    id: c.id as string,
    descricao: c.descricao as string,
    categoria: c.categoria as Conta['categoria'],
    valor: c.valor as number,
    tipo: c.tipo as 'fixa' | 'variavel',
    diaVencimento: c.dia_vencimento as number,
    paga: c.paga as boolean,
    mes: c.mes as number,
    ano: c.ano as number,
    metodoPagamento: (c.metodo_pagamento as Conta['metodoPagamento']) ?? undefined,
    dataPagamento: (c.data_pagamento as string) ?? undefined,
    projetoId: (c.projeto_id as string) ?? undefined,
    isTransferencia: (c.is_transferencia as boolean) ?? false,
    transferenciaPar: (c.transferencia_par_id as string) ?? undefined,
    importacaoId: (c.importacao_id as string) ?? undefined,
  };
}

function mapImportacao(r: Record<string, unknown>): Importacao {
  return {
    id: r.id as string,
    nomeArquivo: r.nome_arquivo as string,
    status: r.status as Importacao['status'],
    totalTransacoes: (r.total_transacoes as number) ?? 0,
    totalImportadas: (r.total_importadas as number) ?? 0,
    totalDuplicatas: (r.total_duplicatas as number) ?? 0,
    createdAt: r.created_at as string,
    bancoId: (r.banco_id as string) ?? undefined,
  };
}

function mapBanco(r: Record<string, unknown>): Banco {
  return {
    id: r.id as string,
    nome: r.nome as string,
    tipo: (r.tipo as Banco['tipo']) ?? 'corrente',
    createdAt: r.created_at as string,
  };
}

class ApiService {
  // ─── Auth ───────────────────────────────────────────
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async register(payload: Record<string, unknown>) {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email as string,
      password: payload.password as string,
      options: {
        data: {
          name: payload.name,
          phone: payload.phone,
        }
      }
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: payload.name,
        phone: payload.phone || ''
      });
    }

    return data;
  }

  async getMe() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      return {
        ...user,
        ...profile,
        salarioBruto: profile.salario_bruto,
        salarioLiquido: profile.salario_liquido,
        onboardingCompleted: profile.onboarding_completed
      };
    }

    return user;
  }

  async refreshToken() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data;
  }

  hasToken() {
    const token = localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
    return !!token;
  }

  clearToken() {
    return supabase.auth.signOut();
  }

  // ─── Contas (CRUD base) ─────────────────────────────
  async getContas(params?: { mes?: number; ano?: number; tipo?: string; status?: string }) {
    let query = supabase.from('contas').select('*');
    if (params?.mes) query = query.eq('mes', params.mes);
    if (params?.ano) query = query.eq('ano', params.ano);
    if (params?.tipo) query = query.eq('tipo', params.tipo);
    if (params?.status === 'paga') query = query.eq('paga', true);
    if (params?.status === 'pendente') query = query.eq('paga', false);

    const { data, error } = await query;
    if (error) throw error;

    return data.map(mapConta);
  }

  async createConta(data: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: created, error } = await supabase.from('contas').insert({
      user_id: user.id,
      descricao: data.descricao,
      categoria: data.categoria,
      valor: data.valor,
      tipo: data.tipo,
      dia_vencimento: data.diaVencimento,
      paga: data.paga || false,
      mes: data.mes,
      ano: data.ano,
      metodo_pagamento: data.metodoPagamento ?? null,
      data_pagamento: data.dataPagamento ?? null,
      projeto_id: data.projetoId ?? null,
      is_transferencia: data.isTransferencia ?? false,
      transferencia_par_id: data.transferenciaPar ?? null,
      importacao_id: data.importacaoId ?? null,
    }).select().single();

    if (error) throw error;
    return mapConta(created as Record<string, unknown>);
  }

  async updateConta(id: string, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = {};

    // Campos base
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.categoria !== undefined) updateData.categoria = data.categoria;
    if (data.valor !== undefined) updateData.valor = data.valor;
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.diaVencimento !== undefined) updateData.dia_vencimento = data.diaVencimento;
    if (data.paga !== undefined) updateData.paga = data.paga;
    if (data.mes !== undefined) updateData.mes = data.mes;
    if (data.ano !== undefined) updateData.ano = data.ano;
    // Campos estendidos
    if (data.metodoPagamento !== undefined) updateData.metodo_pagamento = data.metodoPagamento;
    if (data.dataPagamento !== undefined) updateData.data_pagamento = data.dataPagamento;
    if (data.projetoId !== undefined) updateData.projeto_id = data.projetoId;
    if (data.isTransferencia !== undefined) updateData.is_transferencia = data.isTransferencia;
    if (data.transferenciaPar !== undefined) updateData.transferencia_par_id = data.transferenciaPar;
    if (data.importacaoId !== undefined) updateData.importacao_id = data.importacaoId;

    const { data: updated, error } = await supabase
      .from('contas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapConta(updated as Record<string, unknown>);
  }

  async deleteConta(id: string) {
    const { error } = await supabase.from('contas').delete().eq('id', id);
    if (error) throw error;
  }

  async togglePagamento(id: string) {
    const { data: conta } = await supabase.from('contas').select('paga').eq('id', id).single();
    if (!conta) throw new Error('Conta não encontrada');

    const { data: updated, error } = await supabase
      .from('contas')
      .update({ paga: !conta.paga })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapConta(updated as Record<string, unknown>);
  }

  async getContasEstatisticas(mes?: number, ano?: number) {
    const contas = await this.getContas({ mes, ano });
    const real = contas.filter(c => !c.isTransferencia);
    const total = real.reduce((acc, c) => acc + c.valor, 0);
    const pagas = real.filter(c => c.paga).reduce((acc, c) => acc + c.valor, 0);
    const pendentes = real.filter(c => !c.paga).reduce((acc, c) => acc + c.valor, 0);
    return { total, pagas, pendentes };
  }

  // ─── Contas paginadas com filtros (Despesas) ────────
  async getContasPaginadas(
    filters: ContasFiltros,
    pagination: PaginationState
  ): Promise<{ data: Conta[]; pagination: PaginationInfo }> {
    const { page, pageSize } = pagination;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('contas')
      .select('*', { count: 'exact' })
      .order('ano', { ascending: false })
      .order('mes', { ascending: false })
      .order('dia_vencimento', { ascending: false })
      .range(from, to);

    query = this._applyContasFiltros(query, filters);

    const { data, error, count } = await query;
    if (error) throw error;

    const totalCount = count ?? 0;
    return {
      data: (data ?? []).map((c: Record<string, unknown>) => mapConta(c)),
      pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _applyContasFiltros(query: any, filters: ContasFiltros): any {
    if (filters.dataInicio) {
      const d = new Date(filters.dataInicio);
      query = query.or(`ano.gt.${d.getFullYear()},and(ano.eq.${d.getFullYear()},mes.gte.${d.getMonth() + 1})`);
    }
    if (filters.dataFim) {
      const d = new Date(filters.dataFim);
      query = query.or(`ano.lt.${d.getFullYear()},and(ano.eq.${d.getFullYear()},mes.lte.${d.getMonth() + 1})`);
    }
    if (filters.categorias?.length) query = query.in('categoria', filters.categorias);
    if (filters.metodosPagamento?.length) query = query.in('metodo_pagamento', filters.metodosPagamento);
    if (filters.status === 'paga') query = query.eq('paga', true);
    if (filters.status === 'pendente') query = query.eq('paga', false);
    if (filters.projetoId) query = query.eq('projeto_id', filters.projetoId);
    if (filters.somenteTransferencias) query = query.eq('is_transferencia', true);
    if (filters.excluirTransferencias) query = query.eq('is_transferencia', false);
    if (filters.busca) query = query.ilike('descricao', `%${filters.busca}%`);
    return query;
  }

  // ─── Extrato (tabela transacoes) paginado ───────────
  async getExtratoPaginado(
    filters: TransacoesFiltros,
    pagination: PaginationState
  ): Promise<{ data: Transacao[]; pagination: PaginationInfo }> {
    const { page, pageSize } = pagination;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('transacoes')
      .select('*', { count: 'exact' })
      .order('data_transacao', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    query = this._applyExtradoFiltros(query, filters);

    const { data, error, count } = await query;
    if (error) throw error;

    const totalCount = count ?? 0;
    return {
      data: (data ?? []).map((r: Record<string, unknown>) => mapTransacao(r)),
      pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
    };
  }

  async getExtratoSumario(filters: TransacoesFiltros): Promise<ExtratoSumario> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase.from('transacoes').select('valor, tipo');
    query = this._applyExtradoFiltros(query, filters);
    const { data, error } = await query;
    if (error) throw error;

    let totalReceitas = 0;
    let totalDespesas = 0;
    for (const row of (data ?? [])) {
      if (row.tipo === 'entrada') totalReceitas += Number(row.valor);
      else totalDespesas += Number(row.valor);
    }
    return { totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _applyExtradoFiltros(query: any, filters: TransacoesFiltros): any {
    if (filters.dataInicio) query = query.gte('data_transacao', filters.dataInicio);
    if (filters.dataFim) query = query.lte('data_transacao', filters.dataFim);
    if (filters.tipo && filters.tipo !== 'todas') query = query.eq('tipo', filters.tipo);
    if (filters.categorias?.length) query = query.in('categoria', filters.categorias);
    if (filters.metodosPagamento?.length) query = query.in('metodo_pagamento', filters.metodosPagamento);
    // projetoId: handled client-side (join via projeto_itens) — see useTransacoes hook
    if (filters.projectItemId) query = query.eq('project_item_id', filters.projectItemId);
    if (filters.expenseId) query = query.eq('expense_id', filters.expenseId);
    if (filters.excluirTransferencias) query = query.eq('is_transferencia', false);
    if (filters.bancoId) query = query.eq('banco_id', filters.bancoId);
    if (filters.busca) query = query.ilike('descricao', `%${filters.busca}%`);
    return query;
  }

  async createTransacao(data: Omit<Transacao, 'id' | 'createdAt'>): Promise<Transacao> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: created, error } = await supabase.from('transacoes').insert({
      user_id: user.id,
      descricao: data.descricao,
      valor: data.valor,
      tipo: data.tipo,
      categoria: data.categoria,
      metodo_pagamento: data.metodoPagamento,
      data_transacao: data.dataTransacao,
      expense_id: data.expenseId ?? null,
      project_item_id: data.projectItemId ?? null,
      importacao_id: data.importacaoId ?? null,
      banco_id: data.bancoId ?? null,
      is_transferencia: data.isTransferencia ?? false,
      transferencia_par_id: data.transferenciaPar ?? null,
    }).select().single();

    if (error) throw error;
    return mapTransacao(created as Record<string, unknown>);
  }

  async updateTransacao(id: string, data: Partial<Omit<Transacao, 'id' | 'createdAt'>>): Promise<Transacao> {
    const updateData: Record<string, unknown> = {};
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.valor !== undefined) updateData.valor = data.valor;
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.categoria !== undefined) updateData.categoria = data.categoria;
    if (data.metodoPagamento !== undefined) updateData.metodo_pagamento = data.metodoPagamento;
    if (data.dataTransacao !== undefined) updateData.data_transacao = data.dataTransacao;
    if (data.expenseId !== undefined) updateData.expense_id = data.expenseId;
    if (data.projectItemId !== undefined) updateData.project_item_id = data.projectItemId;
    if (data.isTransferencia !== undefined) updateData.is_transferencia = data.isTransferencia;
    if (data.bancoId !== undefined) updateData.banco_id = data.bancoId;

    const { data: updated, error } = await supabase
      .from('transacoes').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return mapTransacao(updated as Record<string, unknown>);
  }

  async deleteTransacao(id: string): Promise<void> {
    const { error } = await supabase.from('transacoes').delete().eq('id', id);
    if (error) throw error;
  }

  async getTransacoesByProjetoItem(projectItemId: string): Promise<Transacao[]> {
    const { data, error } = await supabase
      .from('transacoes')
      .select('*')
      .eq('project_item_id', projectItemId)
      .order('data_transacao', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapTransacao(r as Record<string, unknown>));
  }

  async toggleProjetoItemCompleted(itemId: string, isCompleted: boolean): Promise<void> {
    const { error } = await supabase
      .from('projeto_itens')
      .update({ is_completed: isCompleted })
      .eq('id', itemId);
    if (error) throw error;
  }

  // ─── Bancos ──────────────────────────────────────────
  async getBancos(): Promise<Banco[]> {
    const { data, error } = await supabase
      .from('bancos')
      .select('*')
      .order('nome', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => mapBanco(r as Record<string, unknown>));
  }

  async createBanco(payload: { nome: string; tipo: BancoTipo }): Promise<Banco> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('bancos')
      .insert({ user_id: user.id, nome: payload.nome, tipo: payload.tipo })
      .select()
      .single();
    if (error) throw error;
    return mapBanco(data as Record<string, unknown>);
  }

  // ─── Transferências Internas ────────────────────────
  async createTransferencia(data: {
    descricao: string;
    valor: number;
    mes: number;
    ano: number;
    diaVencimento: number;
    metodoPagamento?: Conta['metodoPagamento'];
  }): Promise<{ debito: Conta; credito: Conta }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const base = {
      user_id: user.id,
      descricao: data.descricao,
      categoria: 'outros',
      valor: data.valor,
      tipo: 'variavel',
      dia_vencimento: data.diaVencimento,
      paga: true,
      mes: data.mes,
      ano: data.ano,
      is_transferencia: true,
      metodo_pagamento: data.metodoPagamento ?? null,
    };

    // Cria o débito primeiro
    const { data: debito, error: e1 } = await supabase
      .from('contas')
      .insert({ ...base, descricao: `${data.descricao} (saída)` })
      .select()
      .single();
    if (e1) throw e1;

    // Cria o crédito apontando para o débito
    const { data: credito, error: e2 } = await supabase
      .from('contas')
      .insert({ ...base, descricao: `${data.descricao} (entrada)`, transferencia_par_id: debito.id })
      .select()
      .single();
    if (e2) throw e2;

    // Fecha o link bidirecional
    await supabase.from('contas').update({ transferencia_par_id: credito.id }).eq('id', debito.id);

    return {
      debito: mapConta({ ...debito, transferencia_par_id: credito.id } as Record<string, unknown>),
      credito: mapConta(credito as Record<string, unknown>),
    };
  }

  async desvincularTransferencia(id: string): Promise<void> {
    const { data: conta } = await supabase
      .from('contas')
      .select('transferencia_par_id')
      .eq('id', id)
      .single();

    if (conta?.transferencia_par_id) {
      await supabase
        .from('contas')
        .update({ is_transferencia: false, transferencia_par_id: null })
        .eq('id', conta.transferencia_par_id);
    }

    await supabase
      .from('contas')
      .update({ is_transferencia: false, transferencia_par_id: null })
      .eq('id', id);
  }

  // ─── Importação de Extratos ─────────────────────────
  async iniciarImportacao(file: File): Promise<{
    importacaoId: string;
    transacoes: TransacaoImportada[];
  }> {
    // Obtém sessão antes de ler o arquivo para garantir que o token é válido
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Usuário não autenticado');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileContent = (reader.result as string).split(',')[1] ?? reader.result as string;

          const { data, error } = await supabase.functions.invoke('importar-extrato', {
            body: {
              fileContent,
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
            },
            headers: {
              // Garante que o JWT é enviado mesmo com a publishable key
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (error) {
            // Tenta extrair mensagem de erro mais legível da resposta
            const msg = (error as { message?: string; context?: { json?: () => Promise<{ error?: string }> } })
              ?.context?.json?.().then(j => j?.error)
              .catch(() => null);
            throw new Error((await msg) ?? error.message ?? 'Erro na Edge Function');
          }
          resolve(data as { importacaoId: string; transacoes: TransacaoImportada[] });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
      reader.readAsDataURL(file);
    });
  }

  async confirmarImportacao(
    importacaoId: string,
    approvedItems: Omit<Transacao, 'id' | 'createdAt'>[],
    bancoId?: string
  ): Promise<{ imported: number; skipped: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const importacaoUpdate: Record<string, unknown> = {
      status: 'concluido',
      total_importadas: approvedItems.length,
    };
    if (bancoId) importacaoUpdate.banco_id = bancoId;

    if (approvedItems.length === 0) {
      await supabase.from('importacoes').update(importacaoUpdate).eq('id', importacaoId);
      return { imported: 0, skipped: 0 };
    }

    const rows = approvedItems.map(item => ({
      user_id: user.id,
      descricao: item.descricao,
      valor: item.valor,
      tipo: item.tipo,
      categoria: item.categoria,
      metodo_pagamento: item.metodoPagamento ?? 'outros',
      data_transacao: item.dataTransacao,
      expense_id: item.expenseId ?? null,
      project_item_id: item.projectItemId ?? null,
      importacao_id: importacaoId,
      is_transferencia: item.isTransferencia ?? false,
      banco_id: bancoId ?? null,
    }));

    const { error } = await supabase.from('transacoes').insert(rows);
    if (error) throw error;

    await supabase.from('importacoes').update(importacaoUpdate).eq('id', importacaoId);

    return { imported: approvedItems.length, skipped: 0 };
  }

  async getImportacoes(): Promise<Importacao[]> {
    const { data, error } = await supabase
      .from('importacoes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => mapImportacao(r as Record<string, unknown>));
  }

  async deleteImportacao(id: string): Promise<void> {
    // Deleta as transações vinculadas antes
    await supabase.from('transacoes').delete().eq('importacao_id', id);
    const { error } = await supabase.from('importacoes').delete().eq('id', id);
    if (error) throw error;
  }

  // ─── Dashboard ──────────────────────────────────────
  async getDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).maybeSingle();
    const contas = await this.getContas();

    // Exclui transferências internas dos cálculos
    const real = contas.filter(c => !c.isTransferencia);
    const saldoAtual = (profile?.salario_liquido || 0) - real.filter(c => c.paga).reduce((acc, c) => acc + c.valor, 0);
    const despesasTotais = real.reduce((acc, c) => acc + c.valor, 0);

    return {
      saldoAtual,
      receitas: profile?.salario_liquido || 0,
      despesas: despesasTotais,
      economia: Math.max(0, (profile?.salario_liquido || 0) - despesasTotais)
    };
  }

  async getResumoMensal(mes: number, ano: number) {
    const contas = await this.getContas({ mes, ano });
    const real = contas.filter(c => !c.isTransferencia);

    const porCategoria = real.reduce((acc: Record<string, number>, c) => {
      acc[c.categoria] = (acc[c.categoria] || 0) + c.valor;
      return acc;
    }, {});

    return { categorias: porCategoria };
  }

  async getEvolucao() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: profile } = await supabase.from('profiles').select('salario_liquido').eq('id', user.id).maybeSingle();

    const contas = await this.getContas();

    const meses = [...Array(6)].map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        mes: d.getMonth() + 1,
        ano: d.getFullYear(),
        name: d.toLocaleString('pt-BR', { month: 'short' })
      };
    }).reverse();

    return meses.map(m => {
      const contasDoMes = contas.filter(c => c.mes === m.mes && c.ano === m.ano && !c.isTransferencia);
      const despesas = contasDoMes.reduce((acc, c) => acc + c.valor, 0);
      const receitas = profile?.salario_liquido || 0;
      return {
        name: m.name,
        receitas,
        despesas,
        economia: receitas - despesas
      };
    });
  }

  // ─── Análises ───────────────────────────────────────
  async getAnalises() {
    const { data, error } = await supabase.from('analises').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async gerarAnalise() {
    const { data, error } = await supabase.functions.invoke('gerar-analise');
    if (error) throw error;
    return data;
  }

  // ─── Investimentos ──────────────────────────────────
  async getInvestimentos() {
    const { data, error } = await supabase.from('investimentos').select('*');
    if (error) throw error;
    return data;
  }

  async createInvestimento(data: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: created, error } = await supabase.from('investimentos').insert({
      user_id: user.id,
      nome: data.nome,
      tipo: data.tipo,
      valor: data.valor,
      rentabilidade: data.rentabilidade
    }).select().single();

    if (error) throw error;
    return created;
  }

  async deleteInvestimento(id: string) {
    const { error } = await supabase.from('investimentos').delete().eq('id', id);
    if (error) throw error;
  }

  // ─── Projetos ───────────────────────────────────────
  async getProjetos() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.from('projetos').select(`
      *,
      itens:projeto_itens(*)
    `).eq('user_id', user.id);
    if (error) throw error;

    return data.map((p: Record<string, unknown>) => ({
      ...p,
      nome: p.nome,
      titulo: p.nome,
      orcamento: p.orcamento,
      orcamentoLimite: p.orcamento,
      createdAt: p.created_at,
      itens: ((p.itens as Record<string, unknown>[]) || []).map((i: Record<string, unknown>) => ({
        ...i,
        valorEstimado: i.valor_estimado,
        contaId: i.conta_id,
      }))
    }));
  }

  async createProjeto(data: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: created, error } = await supabase.from('projetos').insert({
      user_id: user.id,
      nome: data.titulo || data.nome,
      descricao: data.descricao || '',
      orcamento: data.orcamentoLimite || data.orcamento || 0,
      status: data.status || 'planejado',
    }).select().single();

    if (error) throw error;

    let itemsSaved: Record<string, unknown>[] = [];
    if (data.itens && (data.itens as unknown[]).length > 0) {
      const { data: currentItems } = await supabase.from('projeto_itens').insert(
        (data.itens as Record<string, unknown>[]).map((i: Record<string, unknown>) => ({
          projeto_id: created.id,
          descricao: i.descricao,
          valor_estimado: i.valorEstimado || 0,
          categoria: i.categoria || 'outros',
          conta_id: i.contaId || null,
        }))
      ).select();
      itemsSaved = (currentItems as Record<string, unknown>[]) || [];
    }

    return {
      ...created,
      titulo: created.nome,
      orcamentoLimite: created.orcamento,
      createdAt: created.created_at,
      itens: itemsSaved.map(i => ({
        ...i,
        valorEstimado: i.valor_estimado,
        contaId: i.conta_id,
      })),
    };
  }

  async updateProjeto(id: string, data: Record<string, unknown>) {
    const updatePayload: Record<string, unknown> = {};
    if (data.titulo || data.nome) updatePayload.nome = data.titulo || data.nome;
    if (data.descricao !== undefined) updatePayload.descricao = data.descricao;
    if (data.orcamentoLimite !== undefined || data.orcamento !== undefined) {
      updatePayload.orcamento = (data.orcamentoLimite as number) ?? data.orcamento;
    }
    if (data.status) updatePayload.status = data.status;

    const { data: updated, error } = await supabase
      .from('projetos')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    let itemsSaved: Record<string, unknown>[] = [];
    if (data.itens) {
      await supabase.from('projeto_itens').delete().eq('projeto_id', id);
      if ((data.itens as unknown[]).length > 0) {
        const { data: currentItems } = await supabase.from('projeto_itens').insert(
          (data.itens as Record<string, unknown>[]).map((i: Record<string, unknown>) => ({
            projeto_id: id,
            descricao: i.descricao,
            valor_estimado: i.valorEstimado || 0,
            categoria: i.categoria || 'outros',
            conta_id: i.contaId || null,
          }))
        ).select();
        itemsSaved = (currentItems as Record<string, unknown>[]) || [];
      }
    }

    return {
      ...updated,
      titulo: updated.nome,
      orcamentoLimite: updated.orcamento,
      createdAt: updated.created_at,
      itens: itemsSaved.map(i => ({
        ...i,
        valorEstimado: i.valor_estimado,
        contaId: i.conta_id,
      })),
    };
  }

  async deleteProjeto(id: string) {
    const { error } = await supabase.from('projetos').delete().eq('id', id);
    if (error) throw error;
  }

  // ─── Usuários ───────────────────────────────────────
  async updateUsuario(data: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: Record<string, unknown> = { ...data };
    if (data.salarioBruto !== undefined) updateData.salario_bruto = data.salarioBruto;
    if (data.salarioLiquido !== undefined) updateData.salario_liquido = data.salarioLiquido;
    if (data.onboardingCompleted !== undefined) updateData.onboarding_completed = data.onboardingCompleted;

    delete updateData.salarioBruto;
    delete updateData.salarioLiquido;
    delete updateData.onboardingCompleted;

    const { data: existingProfile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

    const { data: updated, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...(existingProfile || {}), ...updateData })
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  // ─── Categorias ─────────────────────────────────────
  async getCategorias() {
    const { data, error } = await supabase.from('categorias').select('*');
    if (error) throw error;
    return data;
  }
}

export const api = new ApiService();
