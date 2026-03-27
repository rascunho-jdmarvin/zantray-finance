import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FiltrosBar from '@/components/transacoes/FiltrosBar';
import TabelaTransacoes from '@/components/transacoes/TabelaTransacoes';
import { useTransacoes } from '@/hooks/useTransacoes';
import { useBancos } from '@/hooks/useBancos';
import { formatCurrency } from '@/utils/format';
import { api } from '@/services/api';
import {
  CATEGORIA_LABELS, CATEGORIA_ICONS, METODO_PAGAMENTO_LABELS,
  type ContaCategoria, type MetodoPagamento, type Transacao,
} from '@/types';

// ─── Dialog para nova transação manual ──────────────────────
function NovaTransacaoDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<Omit<Transacao, 'id' | 'createdAt'>>({
    descricao: '',
    valor: 0,
    tipo: 'saida',
    categoria: 'outros',
    metodoPagamento: 'outros',
    dataTransacao: today,
    isTransferencia: false,
  });

  const handleSave = async () => {
    if (!form.descricao || form.valor <= 0 || !form.dataTransacao) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      await api.createTransacao(form);
      await qc.invalidateQueries({ queryKey: ['extrato'] });
      await qc.invalidateQueries({ queryKey: ['extrato-sumario'] });
      toast.success('Transação registrada.');
      onClose();
    } catch {
      toast.error('Erro ao salvar transação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Nova Transação</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-1">
        <div>
          <Label>Descrição</Label>
          <Input
            placeholder="Ex: Supermercado Extra"
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Valor (R$)</Label>
            <Input
              type="number" step="0.01" min="0.01"
              value={form.valor || ''}
              onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={form.dataTransacao}
              onChange={e => setForm(f => ({ ...f, dataTransacao: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as Transacao['tipo'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="saida">Saída (Despesa)</SelectItem>
                <SelectItem value="entrada">Entrada (Receita)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Meio de Pagamento</Label>
            <Select value={form.metodoPagamento} onValueChange={v => setForm(f => ({ ...f, metodoPagamento: v as MetodoPagamento }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(METODO_PAGAMENTO_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Categoria</Label>
          <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v as ContaCategoria }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{CATEGORIA_ICONS[k as ContaCategoria]} {v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Registrar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Página ──────────────────────────────────────────────────
export default function TransacoesPage() {
  const navigate = useNavigate();
  const [novaOpen, setNovaOpen] = useState(false);
  const {
    transacoes, paginacao, isLoading, isFetching,
    filtros, setFiltros, setPage, clearFiltros, hasActiveFiltros,
    sumario,
  } = useTransacoes();
  const { bancos } = useBancos();

  const metricsCards = [
    {
      label: 'Total Receitas',
      value: sumario.totalReceitas,
      icon: TrendingUp,
      colorClass: 'text-green-600',
      bgClass: 'bg-green-500/10',
    },
    {
      label: 'Total Despesas',
      value: sumario.totalDespesas,
      icon: TrendingDown,
      colorClass: 'text-red-500',
      bgClass: 'bg-red-500/10',
    },
    {
      label: 'Saldo do Período',
      value: sumario.saldo,
      icon: Wallet,
      colorClass: sumario.saldo >= 0 ? 'text-primary' : 'text-destructive',
      bgClass: sumario.saldo >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Extrato</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Movimentações reais de entrada e saída
            {paginacao && <> · <strong>{paginacao.totalCount}</strong> registros</>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/importacao')}>
            <Upload className="w-4 h-4" />
            Importar Extrato
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setNovaOpen(true)}>
            <Plus className="w-4 h-4" />
            Nova Transação
          </Button>
        </div>
      </motion.div>

      {/* Métricas reativas aos filtros */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {metricsCards.map(m => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${m.bgClass} flex items-center justify-center shrink-0`}>
                  <m.icon className={`w-4 h-4 ${m.colorClass}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className={`text-lg font-bold ${m.colorClass}`}>{formatCurrency(m.value)}</p>
                </div>
              </div>
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
            bancos={bancos}
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
          bancos={bancos}
        />
      </motion.div>

      <Dialog open={novaOpen} onOpenChange={v => { if (!v) setNovaOpen(false); }}>
        {novaOpen && <NovaTransacaoDialog onClose={() => setNovaOpen(false)} />}
      </Dialog>
    </div>
  );
}
