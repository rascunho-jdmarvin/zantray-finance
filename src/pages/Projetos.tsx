import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Pencil, FolderKanban, ChevronDown, ChevronUp,
  Target, CheckCircle2, Clock, PlayCircle, Link2, Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import {
  CATEGORIA_LABELS, CATEGORIA_ICONS, METODO_PAGAMENTO_LABELS,
  type MetodoPagamento, type Projeto, type ProjetoItem, type Transacao,
} from '@/types';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/utils/format';

const STATUS_CONFIG = {
  planejado:    { label: 'Planejado',    icon: Clock,        color: 'bg-muted text-muted-foreground' },
  em_andamento: { label: 'Em andamento', icon: PlayCircle,   color: 'bg-primary/15 text-primary' },
  concluido:    { label: 'Concluído',    icon: CheckCircle2, color: 'bg-success/15 text-success' },
};

// ─── Transações vinculadas a um item de projeto ──────────────
function TransacoesDoItem({ item }: { item: ProjetoItem }) {
  const today = new Date().toISOString().split('T')[0];
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<Transacao, 'id' | 'createdAt'>>({
    descricao: item.descricao,
    valor: item.valorEstimado,
    tipo: 'saida',
    categoria: item.categoria,
    metodoPagamento: 'outros',
    dataTransacao: today,
    projectItemId: item.id,
    isTransferencia: false,
  });

  const load = async () => {
    setLoading(true);
    try { setTransacoes(await api.getTransacoesByProjetoItem(item.id)); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalReal = transacoes.reduce((s, t) => s + t.valor, 0);

  const handleAdd = async () => {
    if (!form.descricao || form.valor <= 0) return;
    setSaving(true);
    try {
      await api.createTransacao({ ...form, projectItemId: item.id });
      await load();
      setAddOpen(false);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  return (
    <div className="mt-2 pl-8 pb-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-3 h-3 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Transações reais</span>
          {transacoes.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{formatCurrency(totalReal)}</Badge>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2 gap-1"
          onClick={() => setAddOpen(v => !v)}>
          <Link2 className="w-3 h-3" /> Adicionar
        </Button>
      </div>

      {loading ? (
        <p className="text-[11px] text-muted-foreground">Carregando...</p>
      ) : transacoes.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">Nenhuma transação vinculada ainda.</p>
      ) : (
        <div className="space-y-1">
          {transacoes.map(t => (
            <div key={t.id} className="flex items-center justify-between bg-background rounded-lg px-2.5 py-1.5 border border-border">
              <div className="min-w-0">
                <p className="text-[11px] font-medium truncate">{t.descricao}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(t.dataTransacao + 'T00:00').toLocaleDateString('pt-BR')} · {METODO_PAGAMENTO_LABELS[t.metodoPagamento]}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold">{formatCurrency(t.valor)}</span>
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive"
                  onClick={() => api.deleteTransacao(t.id).then(load)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
          <p className="text-xs font-medium">Nova transação para "{item.descricao}"</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input className="h-7 text-xs" value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input className="h-7 text-xs" type="number" step="0.01" value={form.valor || ''}
                onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Data</Label>
              <Input className="h-7 text-xs" type="date" value={form.dataTransacao}
                onChange={e => setForm(f => ({ ...f, dataTransacao: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Pagamento</Label>
              <Select value={form.metodoPagamento}
                onValueChange={v => setForm(f => ({ ...f, metodoPagamento: v as MetodoPagamento }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(METODO_PAGAMENTO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={saving}>
              {saving ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────
export default function ProjetosPage() {
  const { projetos, contas, addProjeto, updateProjeto, deleteProjeto } = useApp();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Projeto | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transacoesItemId, setTransacoesItemId] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [status, setStatus] = useState<Projeto['status']>('planejado');
  const [itens, setItens] = useState<Omit<ProjetoItem, 'id'>[]>([]);

  const resetForm = () => {
    setNome(''); setDescricao(''); setOrcamento(''); setStatus('planejado'); setItens([]);
    setEditing(null);
  };

  const openNew = () => { resetForm(); setModalOpen(true); };

  const openEdit = (p: Projeto) => {
    setEditing(p);
    setNome(p.nome); setDescricao(p.descricao);
    setOrcamento(formatCurrency(p.orcamento)); setStatus(p.status);
    setItens(p.itens.map(({ id, ...rest }) => rest));
    setModalOpen(true);
  };

  const addItem = () =>
    setItens([...itens, { descricao: '', valorEstimado: 0, categoria: 'outros', isCompleted: false }]);
  const removeItem = (idx: number) => setItens(itens.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: unknown) => {
    const up = [...itens]; up[idx] = { ...up[idx], [field]: value }; setItens(up);
  };

  const totalItens = itens.reduce((s, i) => s + (i.valorEstimado || 0), 0);

  const handleSave = () => {
    if (!nome) { toast({ title: 'Informe o nome do projeto', variant: 'destructive' }); return; }
    const data = {
      nome, descricao,
      orcamento: parseCurrencyInput(orcamento) || totalItens,
      status,
      itens: itens.map((item, i) => ({ ...item, id: editing?.itens[i]?.id || '' })),
      createdAt: editing?.createdAt || new Date().toISOString().split('T')[0],
    };
    if (editing) { updateProjeto(editing.id, data); toast({ title: 'Projeto atualizado!' }); }
    else { addProjeto(data); toast({ title: 'Projeto criado!' }); }
    setModalOpen(false); resetForm();
  };

  const handleToggleItem = async (projeto: Projeto, item: ProjetoItem) => {
    const newVal = !item.isCompleted;
    try {
      await api.toggleProjetoItemCompleted(item.id, newVal);
      updateProjeto(projeto.id, {
        ...projeto,
        itens: projeto.itens.map(i => i.id === item.id ? { ...i, isCompleted: newVal } : i),
      });
    } catch {
      toast({ title: 'Erro ao atualizar item', variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Projetos</h1>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Novo Projeto
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {(['planejado', 'em_andamento', 'concluido'] as const).map(s => {
          const cfg = STATUS_CONFIG[s];
          const count = projetos.filter(p => p.status === s).length;
          return (
            <div key={s} className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
              <cfg.icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Lista de projetos */}
      {projetos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg">Nenhum projeto criado</p>
          <p className="text-sm mt-1">Crie um projeto para planejar seus gastos</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {projetos.map((projeto, i) => {
              const cfg = STATUS_CONFIG[projeto.status];
              const expanded = expandedId === projeto.id;
              const totalProjeto = projeto.itens.reduce((s, item) => s + item.valorEstimado, 0);
              const completedCount = projeto.itens.filter(item => item.isCompleted).length;

              return (
                <motion.div
                  key={projeto.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
                >
                  <div className="p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : projeto.id)}>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{projeto.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {projeto.itens.length} iten{projeto.itens.length !== 1 ? 's' : ''}
                        {projeto.itens.length > 0 && ` · ${completedCount}/${projeto.itens.length} concluídos`}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    <p className="font-bold text-foreground">{formatCurrency(projeto.orcamento || totalProjeto)}</p>
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border"
                      >
                        <div className="p-4 space-y-3">
                          {projeto.descricao && (
                            <p className="text-sm text-muted-foreground">{projeto.descricao}</p>
                          )}

                          {/* Checklist de itens */}
                          {projeto.itens.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Itens do Projeto</p>
                              {projeto.itens.map(item => {
                                const contaVinculada = item.contaId ? contas.find(c => c.id === item.contaId) : null;
                                const showTransacoes = transacoesItemId === item.id;
                                return (
                                  <div key={item.id}>
                                    <div className={`bg-muted/50 rounded-xl p-3 flex items-start gap-3 ${item.isCompleted ? 'opacity-60' : ''}`}>
                                      <Checkbox
                                        checked={item.isCompleted}
                                        onCheckedChange={() => handleToggleItem(projeto, item)}
                                        className="mt-0.5 shrink-0"
                                      />
                                      <span className="text-lg shrink-0">{CATEGORIA_ICONS[item.categoria]}</span>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium text-foreground ${item.isCompleted ? 'line-through' : ''}`}>
                                          {item.descricao}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {CATEGORIA_LABELS[item.categoria]}
                                          {contaVinculada && <> · Despesa: {contaVinculada.descricao}</>}
                                        </p>
                                        <button
                                          className="text-[11px] text-primary underline-offset-2 hover:underline mt-0.5"
                                          onClick={e => { e.stopPropagation(); setTransacoesItemId(showTransacoes ? null : item.id); }}
                                        >
                                          {showTransacoes ? 'Ocultar transações' : 'Ver transações vinculadas'}
                                        </button>
                                      </div>
                                      <p className="text-sm font-semibold text-foreground shrink-0">
                                        {formatCurrency(item.valorEstimado)}
                                      </p>
                                    </div>
                                    {showTransacoes && <TransacoesDoItem item={item} />}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Barra orçamento */}
                          {projeto.orcamento > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Estimado: {formatCurrency(totalProjeto)}</span>
                                <span>Orçamento: {formatCurrency(projeto.orcamento)}</span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full gradient-primary transition-all"
                                  style={{ width: `${Math.min((totalProjeto / projeto.orcamento) * 100, 100)}%` }} />
                              </div>
                            </div>
                          )}

                          {/* Barra conclusão */}
                          {projeto.itens.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Progresso de conclusão</span>
                                <span>{completedCount}/{projeto.itens.length}</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-green-500 transition-all"
                                  style={{ width: `${(completedCount / projeto.itens.length) * 100}%` }} />
                              </div>
                            </div>
                          )}

                          <Separator />

                          <div className="flex gap-2 justify-end pt-1">
                            <Button variant="outline" size="sm" onClick={() => openEdit(projeto)} className="text-xs rounded-lg">
                              <Pencil className="w-3 h-3 mr-1" /> Editar
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs text-destructive"
                              onClick={() => { deleteProjeto(projeto.id); toast({ title: 'Projeto removido' }); }}>
                              <Trash2 className="w-3 h-3 mr-1" /> Remover
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal criar/editar */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) resetForm(); setModalOpen(v); }}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Projeto</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Reforma da cozinha" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder="Descreva o projeto..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Orçamento Total</Label>
                <Input value={orcamento} onChange={e => setOrcamento(formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as Projeto['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejado">Planejado</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Itens do Projeto</Label>
                <span className="text-xs text-muted-foreground">Total: {formatCurrency(totalItens)}</span>
              </div>
              {itens.map((item, i) => (
                <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Descrição do item" value={item.descricao}
                      onChange={e => updateItem(i, 'descricao', e.target.value)} className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="text-destructive shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Select value={item.categoria} onValueChange={v => updateItem(i, 'categoria', v)}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="R$ 0,00"
                      value={item.valorEstimado ? formatCurrency(item.valorEstimado) : ''}
                      onChange={e => updateItem(i, 'valorEstimado', parseCurrencyInput(formatCurrencyInput(e.target.value)))}
                      className="w-28" />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Adicionar item
              </Button>
            </div>

            <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground rounded-xl">
              {editing ? 'Salvar' : 'Criar Projeto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
