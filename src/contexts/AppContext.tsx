import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, Conta, Analise, Investimento } from '@/types';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  contas: Conta[];
  investimentos: Investimento[];
  analises: Analise[];
  currentMonth: Date;
  loading: boolean;
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => void;
  register: (data: Partial<User> & { password: string }) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substr(2, 9);

// Mock data for demo
const MOCK_CONTAS: Conta[] = [
  { id: '1', descricao: 'Aluguel', categoria: 'moradia', valor: 1500, tipo: 'fixa', diaVencimento: 5, paga: true, mes: 1, ano: 2026 },
  { id: '2', descricao: 'Internet', categoria: 'servicos', valor: 120, tipo: 'fixa', diaVencimento: 10, paga: true, mes: 1, ano: 2026 },
  { id: '3', descricao: 'Energia', categoria: 'moradia', valor: 280, tipo: 'variavel', diaVencimento: 15, paga: false, mes: 2, ano: 2026 },
  { id: '4', descricao: 'Supermercado', categoria: 'alimentacao', valor: 800, tipo: 'variavel', diaVencimento: 20, paga: false, mes: 2, ano: 2026 },
  { id: '5', descricao: 'Combustível', categoria: 'transporte', valor: 350, tipo: 'variavel', diaVencimento: 25, paga: false, mes: 2, ano: 2026 },
  { id: '6', descricao: 'Academia', categoria: 'saude', valor: 120, tipo: 'fixa', diaVencimento: 5, paga: false, mes: 2, ano: 2026 },
  { id: '7', descricao: 'Streaming', categoria: 'lazer', valor: 55, tipo: 'fixa', diaVencimento: 12, paga: true, mes: 2, ano: 2026 },
  { id: '8', descricao: 'Curso Online', categoria: 'educacao', valor: 200, tipo: 'fixa', diaVencimento: 1, paga: false, mes: 2, ano: 2026 },
];

const MOCK_INVESTIMENTOS: Investimento[] = [
  { id: '1', nome: 'Tesouro Selic', tipo: 'Renda Fixa', valor: 5000, rentabilidade: 12.5 },
  { id: '2', nome: 'CDB Banco X', tipo: 'Renda Fixa', valor: 3000, rentabilidade: 13.2 },
  { id: '3', nome: 'Fundo Imobiliário', tipo: 'FII', valor: 2000, rentabilidade: 8.5 },
];

const MOCK_ANALISES: Analise[] = [
  {
    id: '1', mes: 1, ano: 2026, classificacao: 'bom', pontuacao: 72,
    recomendacoes: [
      'Seus gastos com alimentação representam 20% da renda. Tente reduzir para 15%.',
      'Ótimo! Você está investindo regularmente. Continue assim!',
      'Considere criar uma reserva de emergência de 6 meses de despesas.',
    ],
    createdAt: '2026-01-31',
  },
  {
    id: '2', mes: 2, ano: 2026, classificacao: 'atencao', pontuacao: 58,
    recomendacoes: [
      'Suas despesas fixas ultrapassam 60% da renda líquida. Reavalie contratos.',
      'Aumente seus investimentos gradualmente para alcançar 20% da renda.',
      'Negocie o valor do aluguel ou considere alternativas mais econômicas.',
    ],
    createdAt: '2026-02-15',
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    isAuthenticated: false,
    contas: [],
    investimentos: [],
    analises: [],
    currentMonth: new Date(),
    loading: false,
  });

  const login = useCallback((email: string, _password: string) => {
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      user: {
        id: '1',
        name: 'Usuário Demo',
        email,
        phone: '(11) 99999-9999',
        salarioBruto: 8000,
        salarioLiquido: 6200,
        onboardingCompleted: true,
      },
      contas: MOCK_CONTAS,
      investimentos: MOCK_INVESTIMENTOS,
      analises: MOCK_ANALISES,
    }));
  }, []);

  const register = useCallback((data: Partial<User> & { password: string }) => {
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      user: {
        id: generateId(),
        name: data.name || '',
        email: data.email || '',
        phone: '',
        salarioBruto: 0,
        salarioLiquido: 0,
        onboardingCompleted: false,
      },
      contas: [],
      investimentos: [],
      analises: [],
    }));
  }, []);

  const logout = useCallback(() => {
    setState({
      user: null,
      isAuthenticated: false,
      contas: [],
      investimentos: [],
      analises: [],
      currentMonth: new Date(),
      loading: false,
    });
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...data } : null,
    }));
  }, []);

  const completeOnboarding = useCallback((data: { contas: Conta[]; investimentos: Investimento[] }) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, onboardingCompleted: true } : null,
      contas: data.contas,
      investimentos: data.investimentos,
    }));
  }, []);

  const addConta = useCallback((conta: Omit<Conta, 'id'>) => {
    setState(prev => ({
      ...prev,
      contas: [...prev.contas, { ...conta, id: generateId() }],
    }));
  }, []);

  const updateConta = useCallback((id: string, data: Partial<Conta>) => {
    setState(prev => ({
      ...prev,
      contas: prev.contas.map(c => c.id === id ? { ...c, ...data } : c),
    }));
  }, []);

  const deleteConta = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      contas: prev.contas.filter(c => c.id !== id),
    }));
  }, []);

  const togglePaga = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      contas: prev.contas.map(c => c.id === id ? { ...c, paga: !c.paga } : c),
    }));
  }, []);

  const setCurrentMonth = useCallback((date: Date) => {
    setState(prev => ({ ...prev, currentMonth: date }));
  }, []);

  const addInvestimento = useCallback((inv: Omit<Investimento, 'id'>) => {
    setState(prev => ({
      ...prev,
      investimentos: [...prev.investimentos, { ...inv, id: generateId() }],
    }));
  }, []);

  const deleteInvestimento = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      investimentos: prev.investimentos.filter(i => i.id !== id),
    }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      login, register, logout, updateUser, completeOnboarding,
      addConta, updateConta, deleteConta, togglePaga,
      setCurrentMonth, addInvestimento, deleteInvestimento,
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
