import { useState } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { METODO_PAGAMENTO_LABELS, type MetodoPagamento } from '@/types';

interface TransferenciaDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const hoje = new Date();

export default function TransferenciaDialog({ trigger, onSuccess }: TransferenciaDialogProps) {
  const { createTransferencia } = useApp();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    descricao: '',
    valor: 0,
    data: hoje.toISOString().split('T')[0],
    metodoPagamento: 'pix' as MetodoPagamento,
  });

  const handleSubmit = async () => {
    if (!form.descricao || form.valor <= 0) {
      toast.error('Preencha a descrição e o valor.');
      return;
    }

    setSaving(true);
    try {
      const data = new Date(form.data + 'T00:00');
      await createTransferencia({
        descricao: form.descricao,
        valor: form.valor,
        mes: data.getMonth() + 1,
        ano: data.getFullYear(),
        diaVencimento: data.getDate(),
        metodoPagamento: form.metodoPagamento,
      });
      toast.success('Transferência registrada! As duas entradas foram criadas e não contam nos seus gastos.');
      setOpen(false);
      setForm({ descricao: '', valor: 0, data: hoje.toISOString().split('T')[0], metodoPagamento: 'pix' });
      onSuccess?.();
    } catch {
      toast.error('Erro ao registrar a transferência.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeftRight className="w-4 h-4" />
            Transferência
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Transferência Interna
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          Registre movimentações entre suas próprias contas (ex: pagar fatura do cartão).
          Elas não serão contadas como gastos.
        </p>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Descrição</Label>
            <Input
              placeholder="Ex: Pagamento fatura Nubank"
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0.01}
                value={form.valor || ''}
                onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Via</Label>
            <Select
              value={form.metodoPagamento}
              onValueChange={v => setForm(f => ({ ...f, metodoPagamento: v as MetodoPagamento }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(METODO_PAGAMENTO_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
