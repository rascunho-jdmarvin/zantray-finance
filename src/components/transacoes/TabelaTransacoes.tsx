import { useState } from 'react';
import { Edit2, Trash2, Check, ArrowLeftRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/utils/format';
import {
  CATEGORIA_LABELS, METODO_PAGAMENTO_LABELS,
  type Conta, type ContaCategoria, type MetodoPagamento,
} from '@/types';
import { DESPESA_CATEGORIA_LABELS, DESPESA_CATEGORIA_ICONS } from '@/types/finance';
import type { PaginationInfo } from '@/types/transactions';

interface TabelaTransacoesProps {
  transacoes: Conta[];
  paginacao?: PaginationInfo;
  isLoading: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

const ALL_CATEGORIAS = { ...DESPESA_CATEGORIA_LABELS };
const getCatLabel = (c: string) =>
  (ALL_CATEGORIAS as Record<string, string>)[c] ?? CATEGORIA_LABELS[c as ContaCategoria] ?? c;
const getCatIcon = (c: string) =>
  (DESPESA_CATEGORIA_ICONS as Record<string, string>)[c] ?? '📦';

function EditDialog({
  conta,
  onClose,
}: {
  conta: Conta;
  onClose: () => void;
}) {
  const { updateConta, projetos } = useApp();
  const [form, setForm] = useState({
    descricao: conta.descricao,
    valor: conta.valor,
    categoria: conta.categoria as string,
    metodoPagamento: conta.metodoPagamento ?? 'outros',
    projetoId: conta.projetoId ?? '',
    isTransferencia: conta.isTransferencia ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.descricao || form.valor <= 0) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      await updateConta(conta.id, {
        descricao: form.descricao,
        valor: form.valor,
        categoria: form.categoria as ContaCategoria,
        metodoPagamento: form.metodoPagamento as MetodoPagamento,
        projetoId: form.projetoId || undefined,
        isTransferencia: form.isTransferencia,
      });
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
            <Input
              type="number"
              step="0.01"
              value={form.valor}
              onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label>Meio de Pagamento</Label>
            <Select value={form.metodoPagamento} onValueChange={v => setForm(f => ({ ...f, metodoPagamento: v }))}>
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
              {Object.entries(getCatLabel).length > 0 && Object.entries(ALL_CATEGORIAS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{getCatIcon(k)} {v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Projeto (opcional)</Label>
          <Select
            value={form.projetoId || '__none__'}
            onValueChange={v => setForm(f => ({ ...f, projetoId: v === '__none__' ? '' : v }))}
          >
            <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {projetos.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {(p as { nome?: string; titulo?: string }).nome ?? (p as { titulo?: string }).titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isTransf"
            checked={form.isTransferencia}
            onChange={e => setForm(f => ({ ...f, isTransferencia: e.target.checked }))}
            className="rounded border-border"
          />
          <Label htmlFor="isTransf" className="cursor-pointer text-sm">Transferência Interna (não conta nos gastos)</Label>
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
  transacoes, paginacao, isLoading, isFetching, onPageChange, onRefresh,
}: TabelaTransacoesProps) {
  const { togglePaga, deleteConta, projetos } = useApp();
  const [editando, setEditando] = useState<Conta | null>(null);

  const handleDelete = async (id: string, descricao: string) => {
    if (!confirm(`Deletar "${descricao}"?`)) return;
    try {
      await deleteConta(id);
      toast.success('Transação excluída.');
      onRefresh();
    } catch {
      toast.error('Erro ao excluir transação.');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await togglePaga(id);
    } catch {
      toast.error('Erro ao atualizar pagamento.');
    }
  };

  const getProjeto = (projetoId?: string) =>
    projetoId ? projetos.find(p => p.id === projetoId) : null;

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
                <TableHead className="w-24">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Pagamento</TableHead>
                <TableHead className="hidden lg:table-cell">Projeto</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-28 text-center">Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoes.map(t => {
                const projeto = getProjeto(t.projetoId);
                const dataDisplay = `${String(t.diaVencimento).padStart(2, '0')}/${String(t.mes).padStart(2, '0')}/${t.ano}`;

                return (
                  <TableRow key={t.id} className={t.isTransferencia ? 'opacity-60 bg-muted/20' : ''}>
                    <TableCell className="text-xs text-muted-foreground font-mono">{dataDisplay}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{getCatIcon(t.categoria)}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[200px]">{t.descricao}</p>
                          {t.isTransferencia && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <ArrowLeftRight className="w-3 h-3" /> Transferência
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs font-normal">
                        {getCatLabel(t.categoria)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {t.metodoPagamento ? METODO_PAGAMENTO_LABELS[t.metodoPagamento] : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {projeto && (
                        <Badge variant="secondary" className="text-xs max-w-[120px] truncate">
                          {(projeto as { nome?: string; titulo?: string }).nome ?? (projeto as { titulo?: string }).titulo}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm whitespace-nowrap">
                      {formatCurrency(t.valor)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant={t.paga ? 'default' : 'outline'}
                        className="h-6 px-2 text-xs"
                        onClick={() => handleToggle(t.id)}
                      >
                        {t.paga ? <><Check className="w-3 h-3 mr-1" />Pago</> : 'Pendente'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditando(t)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDelete(t.id, t.descricao)}
                        >
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
            <Button
              variant="outline"
              size="sm"
              disabled={paginacao.page === 0}
              onClick={() => onPageChange(paginacao.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={paginacao.page >= paginacao.totalPages - 1}
              onClick={() => onPageChange(paginacao.page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de edição */}
      <Dialog open={!!editando} onOpenChange={open => !open && setEditando(null)}>
        {editando && (
          <EditDialog conta={editando} onClose={() => { setEditando(null); onRefresh(); }} />
        )}
      </Dialog>
    </>
  );
}
