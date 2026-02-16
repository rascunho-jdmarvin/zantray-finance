import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getMonthName } from '@/utils/format';

const STATUS_STYLES = {
  excelente: { bg: 'bg-success/15', text: 'text-success', label: '🌟 Excelente' },
  bom: { bg: 'bg-primary/15', text: 'text-primary', label: '✅ Bom' },
  atencao: { bg: 'bg-warning/15', text: 'text-warning', label: '⚠️ Atenção' },
  critico: { bg: 'bg-destructive/15', text: 'text-destructive', label: '🚨 Crítico' },
};

export default function AnalisesPage() {
  const { analises } = useApp();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Análises</h1>
      </div>

      {analises.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg">Nenhuma análise disponível</p>
          <p className="text-sm mt-1">Complete o onboarding para gerar sua primeira análise</p>
        </div>
      ) : (
        <div className="space-y-4">
          {analises.map((analise, i) => {
            const s = STATUS_STYLES[analise.classificacao];
            return (
              <motion.div
                key={analise.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl border border-border p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {getMonthName(analise.mes - 1)} {analise.ano}
                      </p>
                      <p className="text-xs text-muted-foreground">{analise.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      {s.label}
                    </span>
                    <span className="text-sm font-bold text-foreground">{analise.pontuacao}/100</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {analise.recomendacoes.map((rec, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
