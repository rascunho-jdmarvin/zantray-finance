import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, Conta, Analise, Investimento, Projeto, ProjetoItem } from '@/types';
import { api } from '@/services/api';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  contas: Conta[];
  investimentos: Investimento[];
  analises: Analise[];
  projetos: Projeto[];
  currentMonth: Date;
  loading: boolean;
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: Partial<User> & { password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  completeOnboarding: (data: { contas: Conta[]; investimentos: Investimento[] }) => void;
  addConta: (conta: Omit<Conta, 'id'>) => void;
  updateConta: (id: string, data: Partial<Conta>) => void;
  deleteConta: (id: string) => void;
  togglePaga: (id: string) => void;
  setCurrentMonth: (date: Date) => void;
  addInvestimento: (inv: Omit<Investimento, 'id'>) => void;
  deleteInvestimento: (id: string) => void;
  addProjeto: (proj: Omit<Projeto, 'id'>) => void;
  updateProjeto: (id: string, data: Partial<Projeto>) => void;
  deleteProjeto: (id: string) => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substr(2, 9);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    isAuthenticated: api.hasToken(),
    contas: [],
    investimentos: [],
    analises: [],
    projetos: [],
    currentMonth: new Date(),
    loading: false,
  });

  // Load data when authenticated
  const refreshData = useCallback(async () => {
    if (!api.hasToken()) return;
    setState(prev => ({ ...prev, loading: true }));
    try {
      const [me, contas, investimentos, analises] = await Promise.all([
        api.getMe(),
        api.getContas(),
        api.getInvestimentos(),
        api.getAnalises(),
      ]);
      setState(prev => ({
        ...prev,
        user: me as unknown as User,
        isAuthenticated: true,
        contas: contas as Conta[],
        investimentos: investimentos as Investimento[],
        analises: analises as Analise[],
        loading: false,
      }));
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (api.hasToken()) {
      refreshData();
    }
  }, [refreshData]);

  const login = useCallback(async (email: string, password: string) => {
    await api.login(email, password);
    setState(prev => ({ ...prev, isAuthenticated: true }));
    await refreshData();
  }, [refreshData]);

  const register = useCallback(async (data: Partial<User> & { password: string }) => {
    await api.register(data as Record<string, unknown>);
    setState(prev => ({ ...prev, isAuthenticated: true }));
    await refreshData();
  }, [refreshData]);

  const logout = useCallback(() => {
    api.clearToken();
    setState({
      user: null,
      isAuthenticated: false,
      contas: [],
      investimentos: [],
      analises: [],
      projetos: [],
      currentMonth: new Date(),
      loading: false,
    });
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    try {
      await api.updateUsuario(data as Record<string, unknown>);
      setState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...data } : null,
      }));
    } catch {
      // Fallback to local update
      setState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...data } : null,
      }));
    }
  }, []);

  const completeOnboarding = useCallback((data: { contas: Conta[]; investimentos: Investimento[] }) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, onboardingCompleted: true } : null,
      contas: data.contas,
      investimentos: data.investimentos,
    }));
  }, []);

  const addConta = useCallback(async (conta: Omit<Conta, 'id'>) => {
    try {
      const created = await api.createConta(conta as Record<string, unknown>) as Conta;
      setState(prev => ({
        ...prev,
        contas: [...prev.contas, created],
      }));
    } catch {
      // Fallback local
      setState(prev => ({
        ...prev,
        contas: [...prev.contas, { ...conta, id: generateId() }],
      }));
    }
  }, []);

  const updateConta = useCallback(async (id: string, data: Partial<Conta>) => {
    try {
      await api.updateConta(id, data as Record<string, unknown>);
      setState(prev => ({
        ...prev,
        contas: prev.contas.map(c => c.id === id ? { ...c, ...data } : c),
      }));
    } catch {
      setState(prev => ({
        ...prev,
        contas: prev.contas.map(c => c.id === id ? { ...c, ...data } : c),
      }));
    }
  }, []);

  const deleteConta = useCallback(async (id: string) => {
    try {
      await api.deleteConta(id);
    } catch { /* continue locally */ }
    setState(prev => ({
      ...prev,
      contas: prev.contas.filter(c => c.id !== id),
    }));
  }, []);

  const togglePaga = useCallback(async (id: string) => {
    try {
      await api.togglePagamento(id);
    } catch { /* continue locally */ }
    setState(prev => ({
      ...prev,
      contas: prev.contas.map(c => c.id === id ? { ...c, paga: !c.paga } : c),
    }));
  }, []);

  const setCurrentMonth = useCallback((date: Date) => {
    setState(prev => ({ ...prev, currentMonth: date }));
  }, []);

  const addInvestimento = useCallback(async (inv: Omit<Investimento, 'id'>) => {
    try {
      const created = await api.createInvestimento(inv as Record<string, unknown>) as Investimento;
      setState(prev => ({
        ...prev,
        investimentos: [...prev.investimentos, created],
      }));
    } catch {
      setState(prev => ({
        ...prev,
        investimentos: [...prev.investimentos, { ...inv, id: generateId() }],
      }));
    }
  }, []);

  const deleteInvestimento = useCallback(async (id: string) => {
    try {
      await api.deleteInvestimento(id);
    } catch { /* continue locally */ }
    setState(prev => ({
      ...prev,
      investimentos: prev.investimentos.filter(i => i.id !== id),
    }));
  }, []);

  // ─── Projetos (local for now, backend doesn't exist yet) ───
  const addProjeto = useCallback((proj: Omit<Projeto, 'id'>) => {
    setState(prev => ({
      ...prev,
      projetos: [...prev.projetos, { ...proj, id: generateId() }],
    }));
  }, []);

  const updateProjeto = useCallback((id: string, data: Partial<Projeto>) => {
    setState(prev => ({
      ...prev,
      projetos: prev.projetos.map(p => p.id === id ? { ...p, ...data } : p),
    }));
  }, []);

  const deleteProjeto = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      projetos: prev.projetos.filter(p => p.id !== id),
    }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      login, register, logout, updateUser, completeOnboarding,
      addConta, updateConta, deleteConta, togglePaga,
      setCurrentMonth, addInvestimento, deleteInvestimento,
      addProjeto, updateProjeto, deleteProjeto,
      refreshData,
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
