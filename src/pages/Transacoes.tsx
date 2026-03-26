import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeftRight, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FiltrosBar from '@/components/transacoes/FiltrosBar';
import TabelaTransacoes from '@/components/transacoes/TabelaTransacoes';
import TransferenciaDialog from '@/components/transferencias/TransferenciaDialog';
import { useTransacoes } from '@/hooks/useTransacoes';
import { useFinance } from '@/contexts/FinanceContext';
import { formatCurrency } from '@/utils/format';

export default function TransacoesPage() {
  const navigate = useNavigate();
  const { transacoes, paginacao, isLoading, isFetching, filtros, setFiltros, setPage, clearFiltros, hasActiveFiltros } = useTransacoes();
  const { totalMes, totalPago, totalPendente } = useFinance();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Todas as movimentações financeiras
            {paginacao && <> · <strong>{paginacao.totalCount}</strong> registros</>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <TransferenciaDialog
            trigger={
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeftRight className="w-4 h-4" />
                Transferência
              </Button>
            }
          />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/importacao')}>
            <Upload className="w-4 h-4" />
            Importar Extrato
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => navigate('/despesas')}>
            <Plus className="w-4 h-4" />
            Nova Despesa
          </Button>
        </div>
      </motion.div>

      {/* Resumo */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: 'Total Despesas', value: totalMes, color: 'text-foreground' },
          { label: 'Já Pago', value: totalPago, color: 'text-green-600' },
          { label: 'Pendente', value: totalPendente, color: 'text-amber-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <FiltrosBar
            filtros={filtros}
            onFiltrosChange={setFiltros}
            onClear={clearFiltros}
            hasActive={hasActiveFiltros}
          />
        </CardContent>
      </Card>

      {/* Tabela */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <TabelaTransacoes
          transacoes={transacoes}
          paginacao={paginacao}
          isLoading={isLoading}
          isFetching={isFetching}
          onPageChange={setPage}
          onRefresh={() => setFiltros({ ...filtros })}
        />
      </motion.div>
    </div>
  );
}
