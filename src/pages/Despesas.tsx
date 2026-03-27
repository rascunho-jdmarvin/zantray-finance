import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, Upload, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { useFinance } from '@/contexts/FinanceContext';
import { useApp } from '@/contexts/AppContext';
import { api } from '@/services/api';
import { formatCurrency } from '@/utils/format';
import {
  DESPESA_CATEGORIA_LABELS, DESPESA_CATEGORIA_ICONS,
  type DespesaCategoria, type DespesaTipo, type Despesa,
} from '@/types/finance';
import { METODO_PAGAMENTO_LABELS, type MetodoPagamento, type ContaCategoria, type Projeto as ProjetoBase } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────
const todayStr = new Date().toISOString().split('T')[0];

function isAtrasada(d: Despesa) {
  return !d.paga && d.dataVencimento < todayStr;
}

const emptyForm = (): Omit<Despesa, 'id'> => ({
  titulo: '',
  valor: 0,
  tipo: 'fixa',
  categoria: 'outros',
  dataVencimento: todayStr,
  paga: false,
  parcelada: false,
  totalParcelas: undefined,
  parcelasPagas: undefined,
  parcelaAtual: undefined,
  metodoPagamento: 'outros',
  projetoId: undefined,
});

// ─── Dialog de Registro de Pagamento ────────────────────────
function RegistrarPagamentoDialog({
  despesa,
  onClose,
}: {
  despesa: Despesa;
  onClose: () => void;
}) {
  const { togglePaga } = useFinance();
  const { projetos: projetosBase } = useApp();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [criarTransacao, setCriarTransacao] = useState(true);
  const [form, setForm] = useState<{
    dataPagamento: string;
    metodoPagamento: MetodoPagamento;
    valor: number;
    projetoItemId: string;
  }>({
    dataPagamento: todayStr,
    metodoPagamento: (despesa.metodoPagamento ?? 'outros') as MetodoPagamento,
    valor: despesa.valor,
    projetoItemId: '',
  });

  const projetoAtual = despesa.projetoId
    ? (projetosBase as unknown as ProjetoBase[]).find(p => p.id === despesa.projetoId)
    : null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await togglePaga(despesa.id);
      if (criarTransacao) {
        await api.createTransacao({
          descricao: despesa.titulo,
          valor: form.valor,
          tipo: 'saida',
          categoria: despesa.categoria as ContaCategoria,
          metodoPagamento: form.metodoPagamento as MetodoPagamento,
          dataTransacao: form.dataPagamento,
          expenseId: despesa.id,
          projectItemId: form.projetoItemId || undefined,
          isTransferencia: false,
        });
        await qc.invalidateQueries({ queryKey: ['extrato'] });
        await qc.invalidateQueries({ queryKey: ['extrato-sumario'] });
      }
      toast.success('Pagamento registrado!');
      onClose();
    } catch {
      toast.error('Erro ao registrar pagamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Registrar Pagamento</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-1">
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium text-foreground">{despesa.titulo}</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Vencimento: {new Date(despesa.dataVencimento + 'T00:00').toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Valor pago (R$)</Label>
            <Input type="number" step="0.01"
              value={form.valor || ''}
              onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <Label>Data do pagamento</Label>
            <Input type="date" value={form.dataPagamento}
              onChange={e => setForm(f => ({ ...f, dataPagamento: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label>Meio de pagamento</Label>
          <Select value={form.metodoPagamento} onValueChange={v => setForm(f => ({ ...f, metodoPagamento: v as MetodoPagamento }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(METODO_PAGAMENTO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {projetoAtual && projetoAtual.itens.length > 0 && (
          <div>
            <Label>Vincular a item do projeto "{projetoAtual.nome}"</Label>
            <Select value={form.projetoItemId || '__none__'}
              onValueChange={v => setForm(f => ({ ...f, projetoItemId: v === '__none__' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Não vincular" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Não vincular</SelectItem>
                {projetoAtual.itens.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.descricao} ({formatCurrency(item.valorEstimado)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <Checkbox id="criarTransacao" checked={criarTransacao}
            onCheckedChange={v => setCriarTransacao(!!v)} className="mt-0.5" />
          <div>
            <Label htmlFor="criarTransacao" className="cursor-pointer font-medium">Registrar no extrato</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cria uma transação real vinculada a esta despesa para aparecer no Extrato.
            </p>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleConfirm} disabled={saving}>
          {saving ? 'Salvando...' : 'Confirmar Pagamento'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Row de despesa ──────────────────────────────────────────
function DespesaRow({
  d, onEdit, onDelete, onPagar,
}: {
  d: Despesa;
  onEdit: (d: Despesa) => void;
  onDelete: (id: string) => void;
  onPagar: (d: Despesa) => void;
}) {
  const atrasada = isAtrasada(d);
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg shrink-0">{DESPESA_CATEGORIA_ICONS[d.categoria]}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate">{d.titulo}</p>
            {atrasada && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                <AlertCircle className="w-2.5 h-2.5" /> Atrasada
              </Badge>
            )}
            {d.projetoId && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">Projeto</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {d.paga ? 'Paga' : `Vence: ${new Date(d.dataVencimento + 'T00:00').toLocaleDateString('pt-BR')}`}
            {d.parcelada && ` · ${d.parcelaAtual}/${d.totalParcelas}`}
            {d.metodoPagamento && d.metodoPagamento !== 'outros' && ` · ${METODO_PAGAMENTO_LABELS[d.metodoPagamento]}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className="text-sm font-semibold text-foreground whitespace-nowrap">{formatCurrency(d.valor)}</p>
        {d.paga ? (
          <Button size="sm" variant="default" className="h-7 px-2 text-xs gap-1" onClick={() => onPagar(d)}>
            <Check className="w-3 h-3" /> Paga
          </Button>
        ) : (
          <Button size="sm" variant="outline"
            className={`h-7 px-2 text-xs ${atrasada ? 'border-destructive text-destructive hover:bg-destructive/10' : ''}`}
            onClick={() => onPagar(d)}>
            Pagar
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(d)}>
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
          onClick={() => onDelete(d.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────
export default function DespesasPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { despesas, addDespesa, updateDespesa, deleteDespesa, togglePaga, totalMes, totalPago, totalPendente, projetos } = useFinance();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [pagandoDespesa, setPagandoDespesa] = useState<Despesa | null>(null);

  const { abertas, atrasadas, pagas } = useMemo(() => ({
    abertas: despesas.filter(d => !d.paga && !isAtrasada(d)),
    atrasadas: despesas.filter(isAtrasada),
    pagas: despesas.filter(d => d.paga),
  }), [despesas]);

  const handleOpenNew = () => { setForm(emptyForm()); setEditingId(null); setOpen(true); };

  const handleEdit = (d: Despesa) => {
    setForm({
      titulo: d.titulo, valor: d.valor, tipo: d.tipo, categoria: d.categoria,
      dataVencimento: d.dataVencimento, paga: d.paga, parcelada: d.parcelada,
      totalParcelas: d.totalParcelas, parcelasPagas: d.parcelasPagas,
      parcelaAtual: d.parcelaAtual, metodoPagamento: d.metodoPagamento, projetoId: d.projetoId,
    });
    setEditingId(d.id);
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.titulo || form.valor <= 0) return;
    const payload = { ...form, parcelaAtual: form.parcelada ? (form.parcelasPagas || 0) + 1 : undefined };
    if (editingId) updateDespesa(editingId, payload);
    else addDespesa(payload);
    setForm(emptyForm()); setEditingId(null); setOpen(false);
  };

  const handleDelete = (id: string) => { deleteDespesa(id); toast.success('Despesa removida.'); };

  const handlePagar = (d: Despesa) => {
    if (d.paga) togglePaga(d.id);
    else setPagandoDespesa(d);
  };

  const liquido = user?.salarioLiquido || 0;
  const saldoEstimado = liquido - totalMes;

  const DespesaList = ({ items }: { items: Despesa[] }) =>
    items.length === 0
      ? <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa nesta categoria.</p>
      : <>{items.map(d => <DespesaRow key={d.id} d={d} onEdit={handleEdit} onDelete={handleDelete} onPagar={handlePagar} />)}</>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground text-sm mt-1">Contas a pagar e previsão de gastos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/importacao')}>
            <Upload className="w-4 h-4" /> Importar Extrato
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" onClick={handleOpenNew}>
                <Plus className="w-4 h-4" /> Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input value={form.titulo}
                    onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ex: Conta de Luz" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={form.valor || ''}
                      onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label>Data de Vencimento</Label>
                    <Input type="date" value={form.dataVencimento}
                      onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v: DespesaTipo) => setForm(f => ({ ...f, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixa">Fixa</SelectItem>
                        <SelectItem value="variavel">Variável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={form.categoria} onValueChange={(v: DespesaCategoria) => setForm(f => ({ ...f, categoria: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DESPESA_CATEGORIA_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{DESPESA_CATEGORIA_ICONS[k as DespesaCategoria]} {v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Meio de Pagamento</Label>
                  <Select value={form.metodoPagamento ?? 'outros'}
                    onValueChange={(v: MetodoPagamento) => setForm(f => ({ ...f, metodoPagamento: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(METODO_PAGAMENTO_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Projeto (opcional)</Label>
                  <Select value={form.projetoId || '__none__'}
                    onValueChange={v => setForm(f => ({ ...f, projetoId: v === '__none__' ? undefined : v }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {projetos.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="parcelada" checked={form.parcelada}
                    onCheckedChange={c => setForm(f => ({
                      ...f, parcelada: !!c,
                      totalParcelas: c ? 2 : undefined,
                      parcelasPagas: c ? 0 : undefined,
                    }))} />
                  <Label htmlFor="parcelada" className="text-sm cursor-pointer">Compra Parcelada</Label>
                </div>
                {form.parcelada && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Total de Parcelas</Label>
                      <Input type="number" min={2} value={form.totalParcelas || ''}
                        onChange={e => setForm(f => ({ ...f, totalParcelas: parseInt(e.target.value) || 2 }))} />
                    </div>
                    <div>
                      <Label>Parcelas já pagas</Label>
                      <Input type="number" min={0} value={form.parcelasPagas || ''}
                        onChange={e => setForm(f => ({ ...f, parcelasPagas: parseInt(e.target.value) || 0 }))} />
                    </div>
                  </motion.div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{editingId ? 'Atualizar' : 'Salvar'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Relação salário × despesas */}
      {liquido > 0 && totalMes > 0 && (
        <div className="bg-accent rounded-xl p-5 text-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border">
          <div>
            <p className="text-accent-foreground font-medium text-lg">
              Suas despesas consomem {((totalMes / liquido) * 100).toFixed(1)}% do salário líquido
            </p>
            <p className="text-muted-foreground mt-1">
              Salário: <strong className="text-foreground">{formatCurrency(liquido)}</strong> |{' '}
              Despesas: <strong className="text-foreground">{formatCurrency(totalMes)}</strong>
            </p>
          </div>
          <div className="text-right bg-background p-3 rounded-lg border border-border">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Saldo livre estimado</p>
            <p className={`text-xl font-bold ${saldoEstimado < 0 ? 'text-destructive' : 'text-primary'}`}>
              {formatCurrency(saldoEstimado)}
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Mês', value: totalMes, icon: Clock, color: 'text-foreground' },
          { label: 'Já Pago', value: totalPago, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Pendente', value: totalPendente, icon: AlertCircle, color: 'text-amber-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="abertas">
        <TabsList>
          <TabsTrigger value="abertas" className="gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Abertas ({abertas.length})
          </TabsTrigger>
          <TabsTrigger value="atrasadas" className="gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Atrasadas ({atrasadas.length})
          </TabsTrigger>
          <TabsTrigger value="pagas" className="gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pagas ({pagas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="abertas">
          <Card><CardContent className="p-4"><DespesaList items={abertas} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="atrasadas">
          {atrasadas.length > 0 && (
            <div className="mb-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Você tem {atrasadas.length} conta{atrasadas.length > 1 ? 's' : ''} com vencimento passado.
            </div>
          )}
          <Card><CardContent className="p-4"><DespesaList items={atrasadas} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="pagas">
          <Card><CardContent className="p-4"><DespesaList items={pagas} /></CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Dialog registrar pagamento */}
      <Dialog open={!!pagandoDespesa} onOpenChange={v => { if (!v) setPagandoDespesa(null); }}>
        {pagandoDespesa && (
          <RegistrarPagamentoDialog despesa={pagandoDespesa} onClose={() => setPagandoDespesa(null)} />
        )}
      </Dialog>
    </div>
  );
}
