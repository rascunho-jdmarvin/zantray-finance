import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatCurrency } from '@/utils/format';
import { DESPESA_CATEGORIA_LABELS, DESPESA_CATEGORIA_ICONS, type DespesaCategoria, type DespesaTipo, type Despesa } from '@/types/finance';

const emptyForm = (): Omit<Despesa, 'id'> => ({
  titulo: '',
  valor: 0,
  tipo: 'fixa',
  categoria: 'outros',
  dataVencimento: new Date().toISOString().split('T')[0],
  paga: false,
  parcelada: false,
  totalParcelas: undefined,
  parcelasPagas: undefined,
  parcelaAtual: undefined,
});

export default function DespesasPage() {
  const { despesas, addDespesa, deleteDespesa, togglePaga, fixas, variaveis, parceladas, totalMes, totalPago, totalPendente } = useFinance();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const handleSave = () => {
    if (!form.titulo || form.valor <= 0) return;
    addDespesa({
      ...form,
      parcelaAtual: form.parcelada ? (form.parcelasPagas || 0) + 1 : undefined,
    });
    setForm(emptyForm());
    setOpen(false);
  };

  const DespesaRow = ({ d }: { d: Despesa }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg">{DESPESA_CATEGORIA_ICONS[d.categoria]}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{d.titulo}</p>
          <p className="text-xs text-muted-foreground">
            Vence: {new Date(d.dataVencimento).toLocaleDateString('pt-BR')}
            {d.parcelada && ` · Parcela ${d.parcelaAtual}/${d.totalParcelas}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-foreground whitespace-nowrap">{formatCurrency(d.valor)}</p>
        <Button
          size="sm"
          variant={d.paga ? 'default' : 'outline'}
          className="h-7 px-2 text-xs"
          onClick={() => togglePaga(d.id)}
        >
          {d.paga ? <Check className="w-3 h-3" /> : 'Pagar'}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteDespesa(d.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas despesas fixas, variáveis e parceladas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Conta de Luz" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Data de Vencimento</Label>
                  <Input type="date" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} />
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

              {/* Parcelamento */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="parcelada"
                  checked={form.parcelada}
                  onCheckedChange={(c) => setForm(f => ({ ...f, parcelada: !!c, totalParcelas: c ? 2 : undefined, parcelasPagas: c ? 0 : undefined }))}
                />
                <Label htmlFor="parcelada" className="text-sm cursor-pointer">Compra Parcelada</Label>
              </div>
              {form.parcelada && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Total de Parcelas</Label>
                    <Input type="number" min={2} value={form.totalParcelas || ''} onChange={e => setForm(f => ({ ...f, totalParcelas: parseInt(e.target.value) || 2 }))} />
                  </div>
                  <div>
                    <Label>Parcelas já pagas</Label>
                    <Input type="number" min={0} value={form.parcelasPagas || ''} onChange={e => setForm(f => ({ ...f, parcelasPagas: parseInt(e.target.value) || 0 }))} />
                  </div>
                </motion.div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: totalMes },
          { label: 'Pago', value: totalPago },
          { label: 'Pendente', value: totalPendente },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="todas">
        <TabsList>
          <TabsTrigger value="todas">Todas ({despesas.length})</TabsTrigger>
          <TabsTrigger value="fixas">Fixas ({fixas.length})</TabsTrigger>
          <TabsTrigger value="variaveis">Variáveis ({variaveis.length})</TabsTrigger>
          <TabsTrigger value="parceladas">Parceladas ({parceladas.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="todas">
          <Card><CardContent className="p-4">{despesas.map(d => <DespesaRow key={d.id} d={d} />)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="fixas">
          <Card><CardContent className="p-4">{fixas.map(d => <DespesaRow key={d.id} d={d} />)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="variaveis">
          <Card><CardContent className="p-4">{variaveis.map(d => <DespesaRow key={d.id} d={d} />)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="parceladas">
          <Card>
            <CardContent className="p-4">
              {parceladas.map(d => (
                <div key={d.id}>
                  <DespesaRow d={d} />
                  {d.totalParcelas && d.parcelasPagas !== undefined && (
                    <div className="ml-9 mb-2">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(d.parcelasPagas / d.totalParcelas) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {d.parcelasPagas} de {d.totalParcelas} pagas · Restam {d.totalParcelas - d.parcelasPagas}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
