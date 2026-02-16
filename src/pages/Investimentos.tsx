import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, TrendingUp, PieChart } from 'lucide-react';
import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/utils/format';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function InvestimentosPage() {
  const { investimentos, addInvestimento, deleteInvestimento } = useApp();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [valor, setValor] = useState('');
  const [rentabilidade, setRentabilidade] = useState('');

  const total = investimentos.reduce((s, i) => s + i.valor, 0);
  const pieData = investimentos.map((inv, i) => ({
    name: inv.nome,
    value: inv.valor,
    color: COLORS[i % COLORS.length],
  }));

  const handleAdd = () => {
    if (!nome || !parseCurrencyInput(valor)) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    addInvestimento({
      nome,
      tipo: tipo || 'Geral',
      valor: parseCurrencyInput(valor),
      rentabilidade: parseFloat(rentabilidade) || 0,
    });
    toast({ title: 'Investimento adicionado!' });
    setModalOpen(false);
    setNome(''); setTipo(''); setValor(''); setRentabilidade('');
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Investimentos</h1>
        <Button onClick={() => setModalOpen(true)} className="gradient-primary text-primary-foreground rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Novo
        </Button>
      </div>

      {/* Total + Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Investido</p>
          <p className="text-3xl font-bold text-foreground mt-2">{formatCurrency(total)}</p>
          <div className="flex items-center gap-2 mt-2 text-primary text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>{investimentos.length} investimento(s)</span>
          </div>
        </div>

        {pieData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-2">Distribuição</h3>
            <ResponsiveContainer width="100%" height={160}>
              <RPieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </RPieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map(d => (
                <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* List */}
      {investimentos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <PieChart className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>Nenhum investimento registrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {investimentos.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${COLORS[i % COLORS.length]}20` }}>
                <TrendingUp className="w-5 h-5" style={{ color: COLORS[i % COLORS.length] }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{inv.nome}</p>
                <p className="text-xs text-muted-foreground">{inv.tipo} · {inv.rentabilidade}% a.a.</p>
              </div>
              <p className="font-bold text-foreground">{formatCurrency(inv.valor)}</p>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { deleteInvestimento(inv.id); toast({ title: 'Removido' }); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>Novo Investimento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Tesouro Selic" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Input value={tipo} onChange={e => setTipo(e.target.value)} placeholder="Ex: Renda Fixa" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input value={valor} onChange={e => setValor(formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
              </div>
              <div className="space-y-2">
                <Label>Rentabilidade (% a.a.)</Label>
                <Input type="number" value={rentabilidade} onChange={e => setRentabilidade(e.target.value)} placeholder="12.5" />
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full gradient-primary text-primary-foreground rounded-xl">Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
