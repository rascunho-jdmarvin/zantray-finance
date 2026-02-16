import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIA_LABELS, CATEGORIA_ICONS, type Conta, type ContaCategoria } from '@/types';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, getMonthName } from '@/utils/format';

type FilterTipo = 'todas' | 'fixa' | 'variavel';
type FilterStatus = 'todas' | 'paga' | 'pendente';

export default function ContasPage() {
  const { contas, addConta, updateConta, deleteConta, togglePaga, currentMonth, setCurrentMonth } = useApp();
  const { toast } = useToast();
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('todas');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Conta | null>(null);

  // Form
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<ContaCategoria>('outros');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'fixa' | 'variavel'>('fixa');
  const [diaVencimento, setDiaVencimento] = useState('');

  const mes = currentMonth.getMonth() + 1;
  const ano = currentMonth.getFullYear();

  const filteredContas = contas.filter(c => {
    if (c.mes !== mes || c.ano !== ano) return false;
    if (filterTipo !== 'todas' && c.tipo !== filterTipo) return false;
    if (filterStatus === 'paga' && !c.paga) return false;
    if (filterStatus === 'pendente' && c.paga) return false;
    return true;
  });

  const totalFiltrado = filteredContas.reduce((s, c) => s + c.valor, 0);

  const openNew = () => {
    setEditing(null);
    setDescricao(''); setCategoria('outros'); setValor(''); setTipo('fixa'); setDiaVencimento('');
    setModalOpen(true);
  };

  const openEdit = (conta: Conta) => {
    setEditing(conta);
    setDescricao(conta.descricao);
    setCategoria(conta.categoria);
    setValor(formatCurrency(conta.valor));
    setTipo(conta.tipo);
    setDiaVencimento(String(conta.diaVencimento));
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!descricao || !parseCurrencyInput(valor)) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    const data = {
      descricao,
      categoria,
      valor: parseCurrencyInput(valor),
      tipo,
      diaVencimento: parseInt(diaVencimento) || 1,
      paga: false,
      mes,
      ano,
    };
    if (editing) {
      updateConta(editing.id, data);
      toast({ title: 'Conta atualizada!' });
    } else {
      addConta(data);
      toast({ title: 'Conta adicionada!' });
    }
    setModalOpen(false);
  };

  const changeMonth = (dir: number) => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + dir);
    setCurrentMonth(d);
  };

  const filterButtons = (
    items: { key: string; label: string }[],
    current: string,
    onChange: (v: string) => void,
  ) => (
    <div className="flex bg-muted rounded-xl p-1 gap-0.5">
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            current === item.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Contas</h1>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Nova Conta
        </Button>
      </div>

      {/* Month Nav */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <span className="text-foreground font-semibold">
          {getMonthName(currentMonth.getMonth())} {ano}
        </span>
        <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {filterButtons(
          [{ key: 'todas', label: 'Todas' }, { key: 'fixa', label: 'Fixas' }, { key: 'variavel', label: 'Variáveis' }],
          filterTipo,
          v => setFilterTipo(v as FilterTipo),
        )}
        {filterButtons(
          [{ key: 'todas', label: 'Todas' }, { key: 'paga', label: 'Pagas' }, { key: 'pendente', label: 'A Pagar' }],
          filterStatus,
          v => setFilterStatus(v as FilterStatus),
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredContas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">📦 Nenhuma conta encontrada</p>
              <p className="text-sm mt-1">Adicione suas contas para este mês</p>
            </div>
          ) : (
            filteredContas.map(conta => (
              <motion.div
                key={conta.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card rounded-2xl border border-border p-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{CATEGORIA_ICONS[conta.categoria]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{conta.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORIA_LABELS[conta.categoria]} · Vence dia {conta.diaVencimento} · {conta.tipo === 'fixa' ? 'Fixa' : 'Variável'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{formatCurrency(conta.valor)}</p>
                    {conta.paga && (
                      <span className="text-xs text-primary font-medium">Pago ✓</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePaga(conta.id)}
                    className="text-xs rounded-lg"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    {conta.paga ? 'Desfazer' : 'Pagar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(conta)} className="text-xs">
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { deleteConta(conta.id); toast({ title: 'Conta removida' }); }}
                    className="text-xs text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Total */}
      {filteredContas.length > 0 && (
        <div className="bg-muted rounded-2xl p-4 text-center">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalFiltrado)}</p>
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Aluguel" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoria} onValueChange={v => setCategoria(v as ContaCategoria)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={v => setTipo(v as 'fixa' | 'variavel')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixa">Fixa</SelectItem>
                    <SelectItem value="variavel">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input value={valor} onChange={e => setValor(formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
              </div>
              <div className="space-y-2">
                <Label>Dia vencimento</Label>
                <Input type="number" min={1} max={31} value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground rounded-xl">
              {editing ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
