export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  salarioBruto: number;
  salarioLiquido: number;
  onboardingCompleted: boolean;
}

export type MetodoPagamento = 'dinheiro' | 'debito' | 'credito' | 'pix' | 'boleto' | 'outros';

export const METODO_PAGAMENTO_LABELS: Record<MetodoPagamento, string> = {
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'Pix',
  boleto: 'Boleto',
  outros: 'Outros',
};

// ─── Banco (Conta Bancária / Cartão) ─────────────
export type BancoTipo = 'corrente' | 'poupanca' | 'credito' | 'investimento';

export const BANCO_TIPO_LABELS: Record<BancoTipo, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  credito: 'Cartão de Crédito',
  investimento: 'Investimento',
};

export interface Banco {
  id: string;
  nome: string;
  tipo: BancoTipo;
  createdAt: string;
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
  // Campos estendidos
  metodoPagamento?: MetodoPagamento;
  dataPagamento?: string; // ISO date
  projetoId?: string;
  isTransferencia?: boolean;
  transferenciaPar?: string; // id da conta par em transferências internas
  importacaoId?: string;
}

// ─── Importação de Extratos ──────────────────────────
export interface Importacao {
  id: string;
  nomeArquivo: string;
  status: 'processando' | 'concluido' | 'erro' | 'revisao_pendente';
  totalTransacoes: number;
  totalImportadas: number;
  totalDuplicatas: number;
  createdAt: string;
  bancoId?: string;
}

export interface TransacaoImportada {
  descricao: string;
  valor: number;
  data: string; // ISO date
  categoria: ContaCategoria;
  metodoPagamento: MetodoPagamento;
  tipo: 'fixa' | 'variavel' | TransacaoTipo;
  possivelDuplicata: boolean;
  duplicataDeId?: string;
  confiancaCategoria: number; // 0-1
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

// ─── Transações (Extrato Real) ────────────────────
export type TransacaoTipo = 'entrada' | 'saida';

export interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: TransacaoTipo;
  categoria: ContaCategoria;
  metodoPagamento: MetodoPagamento;
  dataTransacao: string; // ISO date YYYY-MM-DD
  expenseId?: string;    // linked conta (despesa planejada)
  projectItemId?: string;
  importacaoId?: string;
  bancoId?: string;
  isTransferencia: boolean;
  transferenciaPar?: string;
  createdAt: string;
}

// ─── Projetos ─────────────────────────────────────
export interface ProjetoItem {
  id: string;
  descricao: string;
  valorEstimado: number;
  categoria: ContaCategoria;
  contaId?: string; // linked conta (legacy)
  isCompleted: boolean;
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
