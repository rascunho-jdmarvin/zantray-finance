import { useState } from 'react';
import { Edit2, Trash2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useApp } from '@/contexts/AppContext';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { formatCurrency } from '@/utils/format';
import { CATEGORIA_LABELS, METODO_PAGAMENTO_LABELS, CATEGORIA_ICONS, type ContaCategoria, type MetodoPagamento, type Transacao, type Banco } from '@/types';
import type { PaginationInfo } from '@/types/transactions';

interface TabelaTransacoesProps {
  transacoes: Transacao[];
  paginacao?: PaginationInfo;
  isLoading: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  bancos?: Banco[];
}

function EditDialog({ transacao, onClose }: { transacao: Transacao; onClose: () => void }) {
  const { projetos } = useApp();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    descricao: transacao.descricao,
    valor: transacao.valor,
    tipo: transacao.tipo,
    categoria: transacao.categoria as string,
    metodoPagamento: transacao.metodoPagamento,
    dataTransacao: transacao.dataTransacao,
    isTransferencia: transacao.isTransferencia,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.descricao || form.valor <= 0) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      await api.updateTransacao(transacao.id, {
        descricao: form.descricao,
        valor: form.valor,
        tipo: form.tipo,
        categoria: form.categoria as ContaCategoria,
        metodoPagamento: form.metodoPagamento as MetodoPagamento,
        dataTransacao: form.dataTransacao,
        isTransferencia: form.isTransferencia,
      });
      await qc.invalidateQueries({ queryKey: ['extrato'] });
      await qc.invalidateQueries({ queryKey: ['extrato-sumario'] });
      toast.success('Transação atualizada.');
      onClose();
    } catch {
      toast.error('Erro ao atualizar a transação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Editar Transação</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div>
          <Label>Descrição</Label>
          <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={form.valor}
              onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.dataTransacao}
              onChange={e => setForm(f => ({ ...f, dataTransacao: e.target.value }))} />
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
          <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{CATEGORIA_ICONS[k as ContaCategoria]} {v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {projetos.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Para vincular a um projeto, use a tela de Projetos.
          </div>
        )}
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isTransf" checked={form.isTransferencia}
            onChange={e => setForm(f => ({ ...f, isTransferencia: e.target.checked }))}
            className="rounded border-border" />
          <Label htmlFor="isTransf" className="cursor-pointer text-sm">Transferência interna (não conta nos totais)</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function TabelaTransacoes({
  transacoes, paginacao, isLoading, isFetching, onPageChange, onRefresh, bancos,
}: TabelaTransacoesProps) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Transacao | null>(null);

  const handleDelete = async (id: string, descricao: string) => {
    if (!confirm(`Deletar "${descricao}"?`)) return;
    try {
      await api.deleteTransacao(id);
      await qc.invalidateQueries({ queryKey: ['extrato'] });
      await qc.invalidateQueries({ queryKey: ['extrato-sumario'] });
      toast.success('Transação excluída.');
      onRefresh();
    } catch {
      toast.error('Erro ao excluir transação.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (transacoes.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">Nenhuma transação encontrada com os filtros aplicados.</p>
        <p className="text-xs mt-1 opacity-60">Importe um extrato ou registre transações manualmente.</p>
      </div>
    );
  }

  return (
    <>
      <div className={`relative transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
        {isFetching && (
          <div className="absolute top-2 right-2 z-10">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Pagamento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoes.map(t => {
                const isEntrada = t.tipo === 'entrada';
                const dataFmt = t.dataTransacao
                  ? new Date(t.dataTransacao + 'T00:00').toLocaleDateString('pt-BR')
                  : '—';

                return (
                  <TableRow key={t.id} className={t.isTransferencia ? 'opacity-60 bg-muted/20' : ''}>
                    <TableCell className="text-xs text-muted-foreground font-mono">{dataFmt}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          t.isTransferencia ? 'bg-muted' : isEntrada ? 'bg-green-500/15' : 'bg-red-500/15'
                        }`}>
                          {t.isTransferencia
                            ? <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
                            : isEntrada
                              ? <ArrowDownLeft className="w-3 h-3 text-green-600" />
                              : <ArrowUpRight className="w-3 h-3 text-red-500" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[200px]">{t.descricao}</p>
                          {t.isTransferencia && (
                            <span className="text-xs text-muted-foreground">Transferência interna</span>
                          )}
                          {t.bancoId && bancos && (
                            <span className="text-xs text-muted-foreground">
                              {bancos.find(b => b.id === t.bancoId)?.nome}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs font-normal">
                        {CATEGORIA_ICONS[t.categoria]} {CATEGORIA_LABELS[t.categoria] ?? t.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {METODO_PAGAMENTO_LABELS[t.metodoPagamento] ?? t.metodoPagamento ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm whitespace-nowrap">
                      <span className={isEntrada ? 'text-green-600' : ''}>
                        {isEntrada ? '+' : '-'}{formatCurrency(t.valor)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditando(t)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDelete(t.id, t.descricao)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Paginação */}
      {paginacao && paginacao.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {paginacao.totalCount} transações · Página {paginacao.page + 1} de {paginacao.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={paginacao.page === 0}
              onClick={() => onPageChange(paginacao.page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={paginacao.page >= paginacao.totalPages - 1}
              onClick={() => onPageChange(paginacao.page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!editando} onOpenChange={open => !open && setEditando(null)}>
        {editando && (
          <EditDialog transacao={editando} onClose={() => { setEditando(null); onRefresh(); }} />
        )}
      </Dialog>
    </>
  );
}
