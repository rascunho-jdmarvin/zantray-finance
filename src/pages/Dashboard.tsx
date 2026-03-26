import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFinance } from '@/contexts/FinanceContext';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/utils/format';

const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const containerAnim = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function DashboardPage() {
  const { user } = useApp();
  const { despesas, totalMes, totalPago, totalPendente, proximasVencer } = useFinance();

  const pieData = useMemo(() => {
    const fixas = despesas.filter(d => d.tipo === 'fixa').reduce((s, d) => s + d.valor, 0);
    const variaveis = despesas.filter(d => d.tipo === 'variavel').reduce((s, d) => s + d.valor, 0);
    return [
      { name: 'Fixas', value: fixas, color: 'hsl(var(--chart-investment))' },
      { name: 'Variáveis', value: variaveis, color: 'hsl(var(--chart-saving))' },
    ];
  }, [despesas]);

  const liquido = user?.salarioLiquido || 0;
  const saldoEstimado = liquido - totalMes;

  const kpis = [
    { label: 'Total do Mês', value: totalMes, icon: DollarSign, color: 'text-foreground' },
    { label: 'Total Pago', value: totalPago, icon: CheckCircle2, color: 'text-primary' },
    { label: 'Total Pendente', value: totalPendente, icon: Clock, color: 'text-warning' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral das suas finanças</p>
      </div>

      <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-6">
        
        {/* Relação Salário x Contas */}
        {liquido > 0 && totalMes > 0 && (
          <motion.div variants={itemAnim}>
            <div className="bg-accent rounded-xl p-5 text-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-border">
              <div>
                <p className="text-accent-foreground font-medium text-lg">
                  Suas contas ocupam {((totalMes / liquido) * 100).toFixed(1)}% do seu salário líquido
                </p>
                <div className="flex gap-4 mt-2 text-muted-foreground">
                  <p>Salário: <strong className="text-foreground">{formatCurrency(liquido)}</strong></p>
                  <p>Despesas: <strong className="text-foreground">{formatCurrency(totalMes)}</strong></p>
                </div>
              </div>
              <div className="text-right bg-background p-3 rounded-lg border border-border">
                <p className="text-muted-foreground text-xs uppercase font-semibold tracking-wide">Saldo Livre Projetado</p>
                <p className={`text-2xl font-bold ${saldoEstimado < 0 ? 'text-destructive' : 'text-primary'}`}>
                  {formatCurrency(saldoEstimado)}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kpis.map(kpi => (
            <motion.div key={kpi.label} variants={itemAnim}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(kpi.value)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Chart + Próximas a Vencer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie */}
          <motion.div variants={itemAnim}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Fixas vs Variáveis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                        fontSize: '0.75rem',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2">
                  {pieData.map(d => (
                    <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name}: {formatCurrency(d.value)}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Próximas a Vencer */}
          <motion.div variants={itemAnim}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Próximas contas a vencer (7 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {proximasVencer.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Nenhuma conta vencendo nos próximos 7 dias 🎉
                  </p>
                ) : (
                  <div className="space-y-3">
                    {proximasVencer.map(d => (
                      <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{d.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            Vence: {new Date(d.dataVencimento).toLocaleDateString('pt-BR')}
                            {d.parcelada && ` · ${d.parcelaAtual}/${d.totalParcelas}x`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{formatCurrency(d.valor)}</p>
                          <Badge variant="outline" className="text-xs border-warning/30 text-warning">
                            Pendente
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
