import type { Despesa, Projeto } from '@/types/finance';

const today = new Date();
const y = today.getFullYear();
const m = today.getMonth();

function iso(day: number, monthOffset = 0) {
  return new Date(y, m + monthOffset, day).toISOString().split('T')[0];
}

export const MOCK_DESPESAS: Despesa[] = [
  // Fixas
  { id: '1', titulo: 'Aluguel', valor: 1800, tipo: 'fixa', categoria: 'moradia', dataVencimento: iso(5), paga: true, parcelada: false },
  { id: '2', titulo: 'Conta de Luz', valor: 220, tipo: 'fixa', categoria: 'moradia', dataVencimento: iso(10), paga: false, parcelada: false },
  { id: '3', titulo: 'Internet', valor: 120, tipo: 'fixa', categoria: 'servicos', dataVencimento: iso(15), paga: false, parcelada: false },
  { id: '4', titulo: 'Plano de Saúde', valor: 450, tipo: 'fixa', categoria: 'saude', dataVencimento: iso(20), paga: false, parcelada: false },
  { id: '5', titulo: 'Academia', valor: 89.90, tipo: 'fixa', categoria: 'saude', dataVencimento: iso(1), paga: true, parcelada: false },

  // Variáveis
  { id: '6', titulo: 'Supermercado', valor: 650, tipo: 'variavel', categoria: 'alimentacao', dataVencimento: iso(8), paga: true, parcelada: false },
  { id: '7', titulo: 'Combustível', valor: 280, tipo: 'variavel', categoria: 'transporte', dataVencimento: iso(12), paga: false, parcelada: false },
  { id: '8', titulo: 'Jantar fora', valor: 145, tipo: 'variavel', categoria: 'lazer', dataVencimento: iso(18), paga: false, parcelada: false },

  // Parceladas
  {
    id: '9', titulo: 'Parcela do Notebook', valor: 499.90, tipo: 'variavel', categoria: 'tecnologia',
    dataVencimento: iso(15), paga: false, parcelada: true, totalParcelas: 10, parcelasPagas: 2, parcelaAtual: 3,
  },
  {
    id: '10', titulo: 'Assinatura Claude Code anual', valor: 200, tipo: 'fixa', categoria: 'assinaturas',
    dataVencimento: iso(25), paga: false, parcelada: true, totalParcelas: 12, parcelasPagas: 4, parcelaAtual: 5,
  },
  {
    id: '11', titulo: 'iPhone 15', valor: 649.90, tipo: 'variavel', categoria: 'tecnologia',
    dataVencimento: iso(20), paga: false, parcelada: true, totalParcelas: 12, parcelasPagas: 6, parcelaAtual: 7,
  },

  // Projeto-linked
  { id: '12', titulo: 'Passagem Curitiba', valor: 580, tipo: 'variavel', categoria: 'lazer', dataVencimento: iso(3), paga: true, parcelada: false, projetoId: 'p1' },
  { id: '13', titulo: 'Hotel Curitiba (3 noites)', valor: 720, tipo: 'variavel', categoria: 'lazer', dataVencimento: iso(10), paga: false, parcelada: false, projetoId: 'p1' },
  { id: '14', titulo: 'Cimento (50 sacos)', valor: 1250, tipo: 'variavel', categoria: 'servicos', dataVencimento: iso(7), paga: true, parcelada: false, projetoId: 'p2' },
  { id: '15', titulo: 'Mão de obra - Pedreiro', valor: 3500, tipo: 'variavel', categoria: 'servicos', dataVencimento: iso(22), paga: false, parcelada: false, projetoId: 'p2' },
  { id: '16', titulo: 'Tijolos', valor: 800, tipo: 'variavel', categoria: 'servicos', dataVencimento: iso(14), paga: false, parcelada: false, projetoId: 'p2' },
];

export const MOCK_PROJETOS: Projeto[] = [
  {
    id: 'p1',
    titulo: 'Viagem Curitiba',
    descricao: 'Viagem de férias para Curitiba em família',
    orcamentoLimite: 5000,
    status: 'em_andamento',
    createdAt: new Date(y, m - 1, 10).toISOString(),
  },
  {
    id: 'p2',
    titulo: 'Construção do Terreno',
    descricao: 'Construção da casa no terreno do bairro novo',
    orcamentoLimite: 80000,
    status: 'em_andamento',
    createdAt: new Date(y, m - 2, 1).toISOString(),
  },
  {
    id: 'p3',
    titulo: 'Reserva de Emergência',
    descricao: 'Juntar 6 meses de despesas como reserva',
    orcamentoLimite: 30000,
    status: 'planejado',
    createdAt: new Date(y, m, 1).toISOString(),
  },
];
