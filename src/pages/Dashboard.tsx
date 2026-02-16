import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingDown, Wallet, TrendingUp,
  Lightbulb, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatPercent, getMonthName } from '@/utils/format';
import { CATEGORIA_LABELS, CATEGORIA_COLORS, type ContaCategoria } from '@/types';

const STATUS_CONFIG = {
  excelente: { label: 'Excelente', color: 'bg-success text-success-foreground', emoji: '🌟' },
  bom: { label: 'Bom', color: 'bg-primary/15 text-primary', emoji: '✅' },
  atencao: { label: 'Atenção', color: 'bg-warning/15 text-warning-foreground', emoji: '⚠️' },
  critico: { label: 'Crítico', color: 'bg-destructive/15 text-destructive', emoji: '🚨' },
};

export default function DashboardPage() {
  const { user, contas, investimentos, analises } = useApp();

  const latestAnalise = analises[analises.length - 1];
  const status = latestAnalise ? STATUS_CONFIG[latestAnalise.classificacao] : STATUS_CONFIG.bom;

  const totalDespesas = useMemo(
    () => contas.reduce((sum, c) => sum + c.valor, 0),
    [contas],
  );

  const totalInvestido = useMemo(
    () => investimentos.reduce((sum, i) => sum + i.valor, 0),
    [investimentos],
  );

  const receita = user?.salarioLiquido || 0;
  const saldo = receita - totalDespesas;

  // Pie chart data
  const categoriaData = useMemo(() => {
    const map: Record<string, number> = {};
    contas.forEach(c => {
      map[c.categoria] = (map[c.categoria] || 0) + c.valor;
    });
    return Object.entries(map).map(([cat, value]) => ({
      name: CATEGORIA_LABELS[cat as ContaCategoria],
      value,
      color: CATEGORIA_COLORS[cat as ContaCategoria],
    }));
  }, [contas]);

  // Trend data (mock 6 months)
  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        name: getMonthName(m.getMonth()).slice(0, 3),
        receita: receita + Math.random() * 500 - 250,
        despesas: totalDespesas * (0.85 + Math.random() * 0.3),
      };
    });
  }, [receita, totalDespesas]);

  const kpis = [
    { label: 'Receita', value: receita, icon: DollarSign, trend: '+2.3%', up: true, percent: 100 },
    { label: 'Despesas', value: totalDespesas, icon: TrendingDown, trend: '-1.5%', up: false, percent: receita ? (totalDespesas / receita) * 100 : 0 },
    { label: 'Saldo', value: saldo, icon: Wallet, trend: saldo >= 0 ? '+5.1%' : '-3.2%', up: saldo >= 0, percent: receita ? Math.abs(saldo / receita) * 100 : 0 },
    { label: 'Investido', value: totalInvestido, icon: TrendingUp, trend: '+8.2%', up: true, percent: receita ? (totalInvestido / receita) * 100 : 0 },
  ];

  const containerAnim = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };
  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {user?.name?.split(' ')[0] || 'Usuário'} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Aqui está o resumo das suas finanças</p>
      </div>

      {/* Status Badge */}
      {latestAnalise && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${status.color}`}>
            {status.emoji} {status.label} — Pontuação: {latestAnalise.pontuacao}/100
          </span>
        </motion.div>
      )}

      <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-6">
        {/* KPI + Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KPIs */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {kpis.map(kpi => (
              <motion.div
                key={kpi.label}
                variants={itemAnim}
                className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <kpi.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium ${kpi.up ? 'text-primary' : 'text-destructive'}`}>
                    {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {kpi.trend}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(kpi.value)}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatPercent(kpi.percent)} da receita</p>
              </motion.div>
            ))}
          </div>

          {/* Pie Chart */}
          <motion.div variants={itemAnim} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">Despesas por Categoria</h3>
            {categoriaData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={categoriaData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                      {categoriaData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categoriaData.map(d => (
                    <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Nenhuma despesa registrada
              </div>
            )}
          </motion.div>
        </div>

        {/* Line Chart */}
        <motion.div variants={itemAnim} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">📊 Evolução Mensal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Line type="monotone" dataKey="receita" stroke="hsl(var(--chart-income))" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="despesas" stroke="hsl(var(--chart-expense))" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recommendations */}
        {latestAnalise && (
          <motion.div variants={itemAnim} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">💡 Recomendações da IA</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {latestAnalise.recomendacoes.map((rec, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Lightbulb className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
