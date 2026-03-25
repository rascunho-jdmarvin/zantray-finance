// ─── Despesas ─────────────────────────────────────
export type DespesaTipo = 'fixa' | 'variavel';

export type DespesaCategoria =
  | 'moradia'
  | 'alimentacao'
  | 'transporte'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'vestuario'
  | 'servicos'
  | 'tecnologia'
  | 'assinaturas'
  | 'outros';

export const DESPESA_CATEGORIA_LABELS: Record<DespesaCategoria, string> = {
  moradia: 'Moradia',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  saude: 'Saúde',
  educacao: 'Educação',
  lazer: 'Lazer',
  vestuario: 'Vestuário',
  servicos: 'Serviços',
  tecnologia: 'Tecnologia',
  assinaturas: 'Assinaturas',
  outros: 'Outros',
};

export const DESPESA_CATEGORIA_ICONS: Record<DespesaCategoria, string> = {
  moradia: '🏠',
  alimentacao: '🍽️',
  transporte: '🚗',
  saude: '🏥',
  educacao: '📚',
  lazer: '🎮',
  vestuario: '👕',
  servicos: '⚙️',
  tecnologia: '💻',
  assinaturas: '📦',
  outros: '📋',
};

export interface Despesa {
  id: string;
  titulo: string;
  valor: number;
  tipo: DespesaTipo;
  categoria: DespesaCategoria;
  dataVencimento: string; // ISO date
  paga: boolean;
  projetoId?: string;
  // Parcelamento
  parcelada: boolean;
  totalParcelas?: number;
  parcelasPagas?: number;
  parcelaAtual?: number; // calculated
}

// ─── Projetos ─────────────────────────────────────
export type ProjetoStatus = 'planejado' | 'em_andamento' | 'concluido';

export interface Projeto {
  id: string;
  titulo: string;
  descricao: string;
  orcamentoLimite: number;
  status: ProjetoStatus;
  createdAt: string;
}

export const PROJETO_STATUS_LABELS: Record<ProjetoStatus, string> = {
  planejado: 'Planejado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
};
