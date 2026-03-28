import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, Conta, Analise, Investimento, Projeto, Importacao } from '@/types';
import { api } from '@/services/api';
import { supabase } from '@/lib/supabase';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  contas: Conta[];
  investimentos: Investimento[];
  analises: Analise[];
  projetos: Projeto[];
  importacoes: Importacao[];
  currentMonth: Date;
  loading: boolean;
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: Partial<User> & { password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  completeOnboarding: (data: { contas: Conta[]; investimentos: Investimento[] }) => void;
  addConta: (conta: Omit<Conta, 'id'>) => Promise<void>;
  updateConta: (id: string, data: Partial<Conta>) => Promise<void>;
  deleteConta: (id: string) => void;
  togglePaga: (id: string) => void;
  createTransferencia: (data: Parameters<typeof api.createTransferencia>[0]) => Promise<void>;
  setCurrentMonth: (date: Date) => void;
  addInvestimento: (inv: Omit<Investimento, 'id'>) => void;
  deleteInvestimento: (id: string) => void;
  addProjeto: (proj: Omit<Projeto, 'id'>) => void;
  updateProjeto: (id: string, data: Partial<Projeto>) => void;
  deleteProjeto: (id: string) => void;
  addImportacao: (imp: Importacao) => void;
  removeImportacao: (id: string) => void;
  updateProjetoItemLocal: (projetoId: string, itemId: string, changes: Partial<import('@/types').ProjetoItem>) => void;
  refreshData: () => Promise<void>;
  refreshProjetos: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 11);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    isAuthenticated: false,
    contas: [],
    investimentos: [],
    analises: [],
    projetos: [],
    importacoes: [],
    currentMonth: new Date(),
    loading: true,
  });

  const refreshData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const [me, contas, investimentos, analises, projetos, importacoes] = await Promise.all([
        api.getMe(),
        api.getContas(),
        api.getInvestimentos(),
        api.getAnalises(),
        api.getProjetos(),
        api.getImportacoes(),
      ]);
      setState(prev => ({
        ...prev,
        user: me as unknown as User,
        contas: contas as Conta[],
        investimentos: investimentos as Investimento[],
        analises: analises as Analise[],
        projetos: projetos as unknown as Projeto[],
        importacoes: importacoes as Importacao[],
        loading: false,
      }));
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) {
        setState(prev => ({ ...prev, isAuthenticated: true }));
        refreshData();
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN') {
        setState(prev => ({ ...prev, isAuthenticated: true }));
        refreshData();
      } else if (_event === 'SIGNED_OUT') {
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          contas: [],
          investimentos: [],
          analises: [],
          projetos: [],
          importacoes: [],
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshData]);

  const login = useCallback(async (email: string, password: string) => {
    await api.login(email, password);
  }, []);

  const register = useCallback(async (data: Partial<User> & { password: string }) => {
    await api.register(data as Record<string, unknown>);
  }, []);

  const logout = useCallback(async () => {
    await api.clearToken();
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    try {
      await api.updateUsuario(data as Record<string, unknown>);
    } catch { /* falha silenciosa */ }
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...data } : null,
    }));
  }, []);

  const completeOnboarding = useCallback(async (data: { contas: Conta[]; investimentos: Investimento[] }) => {
    try {
      for (const conta of data.contas) {
        await api.createConta(conta as unknown as Record<string, unknown>);
      }
      for (const inv of data.investimentos) {
        await api.createInvestimento(inv as unknown as Record<string, unknown>);
      }
      await api.updateUsuario({ onboardingCompleted: true });
      setState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, onboardingCompleted: true } : null,
        contas: data.contas,
        investimentos: data.investimentos,
      }));
    } catch {
      setState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, onboardingCompleted: true } : null,
        contas: data.contas,
        investimentos: data.investimentos,
      }));
    }
  }, []);

  const addConta = useCallback(async (conta: Omit<Conta, 'id'>) => {
    try {
      const created = await api.createConta(conta as unknown as Record<string, unknown>);
      setState(prev => ({ ...prev, contas: [...prev.contas, created] }));
    } catch {
      setState(prev => ({ ...prev, contas: [...prev.contas, { ...conta, id: generateId() }] }));
    }
  }, []);

  const updateConta = useCallback(async (id: string, data: Partial<Conta>) => {
    try {
      await api.updateConta(id, data as unknown as Record<string, unknown>);
    } catch { /* atualiza local de qualquer forma */ }
    setState(prev => ({
      ...prev,
      contas: prev.contas.map(c => c.id === id ? { ...c, ...data } : c),
    }));
  }, []);

  const deleteConta = useCallback(async (id: string) => {
    try {
      await api.deleteConta(id);
    } catch { /* ignored */ }
    setState(prev => ({ ...prev, contas: prev.contas.filter(c => c.id !== id) }));
  }, []);

  const togglePaga = useCallback(async (id: string) => {
    try {
      await api.togglePagamento(id);
    } catch { /* ignored */ }
    setState(prev => ({
      ...prev,
      contas: prev.contas.map(c => c.id === id ? { ...c, paga: !c.paga } : c),
    }));
  }, []);

  const createTransferencia = useCallback(async (data: Parameters<typeof api.createTransferencia>[0]) => {
    const { debito, credito } = await api.createTransferencia(data);
    setState(prev => {
      let contas = [...prev.contas, debito, credito];
      // Marca despesa vinculada como paga no estado local
      if (data.despesaId) {
        const dataStr = `${data.ano}-${String(data.mes).padStart(2, '0')}-${String(data.diaVencimento).padStart(2, '0')}`;
        contas = contas.map(c => c.id === data.despesaId ? { ...c, paga: true, dataPagamento: dataStr } : c);
      }
      // Vincula item de projeto ao débito no estado local
      let projetos = prev.projetos;
      if (data.projetoId && data.projetoItemId) {
        projetos = projetos.map(p =>
          p.id === data.projetoId
            ? { ...p, itens: p.itens.map(i => i.id === data.projetoItemId ? { ...i, contaId: debito.id, isCompleted: true } : i) }
            : p
        );
      }
      return { ...prev, contas, projetos };
    });
  }, []);

  const refreshProjetos = useCallback(async () => {
    const projetos = await api.getProjetos();
    setState(prev => ({ ...prev, projetos: projetos as unknown as Projeto[] }));
  }, []);

  const setCurrentMonth = useCallback((date: Date) => {
    setState(prev => ({ ...prev, currentMonth: date }));
  }, []);

  const addInvestimento = useCallback(async (inv: Omit<Investimento, 'id'>) => {
    try {
      const created = await api.createInvestimento(inv as unknown as Record<string, unknown>) as Investimento;
      setState(prev => ({ ...prev, investimentos: [...prev.investimentos, created] }));
    } catch {
      setState(prev => ({ ...prev, investimentos: [...prev.investimentos, { ...inv, id: generateId() }] }));
    }
  }, []);

  const deleteInvestimento = useCallback(async (id: string) => {
    try {
      await api.deleteInvestimento(id);
    } catch { /* ignored */ }
    setState(prev => ({ ...prev, investimentos: prev.investimentos.filter(i => i.id !== id) }));
  }, []);

  const addProjeto = useCallback(async (proj: Omit<Projeto, 'id'>) => {
    try {
      const created = await api.createProjeto(proj as unknown as Record<string, unknown>);
      setState(prev => ({ ...prev, projetos: [...prev.projetos, created as unknown as Projeto] }));
    } catch {
      setState(prev => ({ ...prev, projetos: [...prev.projetos, { ...proj, id: generateId() } as Projeto] }));
    }
  }, []);

  const updateProjeto = useCallback(async (id: string, data: Partial<Projeto>) => {
    try {
      const updated = await api.updateProjeto(id, data as unknown as Record<string, unknown>);
      setState(prev => ({
        ...prev,
        projetos: prev.projetos.map(p => p.id === id ? { ...p, ...updated } as Projeto : p),
      }));
    } catch {
      setState(prev => ({
        ...prev,
        projetos: prev.projetos.map(p => p.id === id ? { ...p, ...data } : p),
      }));
    }
  }, []);

  const deleteProjeto = useCallback(async (id: string) => {
    try {
      await api.deleteProjeto(id);
    } catch { /* ignored */ }
    setState(prev => ({ ...prev, projetos: prev.projetos.filter(p => p.id !== id) }));
  }, []);

  const updateProjetoItemLocal = useCallback((projetoId: string, itemId: string, changes: Partial<import('@/types').ProjetoItem>) => {
    setState(prev => ({
      ...prev,
      projetos: prev.projetos.map(p =>
        p.id === projetoId
          ? { ...p, itens: p.itens.map(i => i.id === itemId ? { ...i, ...changes } : i) }
          : p
      ),
    }));
  }, []);

  const addImportacao = useCallback((imp: Importacao) => {
    setState(prev => ({ ...prev, importacoes: [imp, ...prev.importacoes] }));
  }, []);

  const removeImportacao = useCallback(async (id: string) => {
    try {
      await api.deleteImportacao(id);
    } catch { /* ignored */ }
    setState(prev => ({
      ...prev,
      importacoes: prev.importacoes.filter(i => i.id !== id),
      contas: prev.contas.filter(c => c.importacaoId !== id),
    }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      login, register, logout, updateUser, completeOnboarding,
      addConta, updateConta, deleteConta, togglePaga, createTransferencia,
      setCurrentMonth, addInvestimento, deleteInvestimento,
      addProjeto, updateProjeto, deleteProjeto, updateProjetoItemLocal,
      addImportacao, removeImportacao,
      refreshData, refreshProjetos,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
