export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  salarioBruto: number;
  salarioLiquido: number;
  onboardingCompleted: boolean;
}

export interface Conta {
  id: string;
  descricao: string;
  categoria: ContaCategoria;
  valor: number;
  tipo: 'fixa' | 'variavel';
  diaVencimento: number;
  paga: boolean;
  mes: number;
  ano: number;
}

export type ContaCategoria =
  | 'moradia'
  | 'alimentacao'
  | 'transporte'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'vestuario'
  | 'servicos'
  | 'investimento'
  | 'outros';

export const CATEGORIA_LABELS: Record<ContaCategoria, string> = {
  moradia: 'Moradia',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  saude: 'Saúde',
  educacao: 'Educação',
  lazer: 'Lazer',
  vestuario: 'Vestuário',
  servicos: 'Serviços',
  investimento: 'Investimento',
  outros: 'Outros',
};

export const CATEGORIA_ICONS: Record<ContaCategoria, string> = {
  moradia: '🏠',
  alimentacao: '🍽️',
  transporte: '🚗',
  saude: '🏥',
  educacao: '📚',
  lazer: '🎮',
  vestuario: '👕',
  servicos: '⚙️',
  investimento: '📈',
  outros: '📦',
};

export const CATEGORIA_COLORS: Record<ContaCategoria, string> = {
  moradia: '#10B981',
  alimentacao: '#F59E0B',
  transporte: '#3B82F6',
  saude: '#EF4444',
  educacao: '#8B5CF6',
  lazer: '#EC4899',
  vestuario: '#14B8A6',
  servicos: '#6366F1',
  investimento: '#06B6D4',
  outros: '#9CA3AF',
};

export interface Investimento {
  id: string;
  nome: string;
  tipo: string;
  valor: number;
  rentabilidade: number;
}

export interface Analise {
  id: string;
  mes: number;
  ano: number;
  classificacao: 'excelente' | 'bom' | 'atencao' | 'critico';
  pontuacao: number;
  recomendacoes: string[];
  createdAt: string;
}

export type StatusClassificacao = Analise['classificacao'];

// ─── Projetos ─────────────────────────────────────
export interface ProjetoItem {
  id: string;
  descricao: string;
  valorEstimado: number;
  categoria: ContaCategoria;
  contaId?: string; // linked conta
}

export interface Projeto {
  id: string;
  nome: string;
  descricao: string;
  orcamento: number;
  status: 'planejado' | 'em_andamento' | 'concluido';
  dataInicio?: string;
  dataFim?: string;
  itens: ProjetoItem[];
  createdAt: string;
}
