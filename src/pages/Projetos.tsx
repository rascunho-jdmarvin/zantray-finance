import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Pencil, FolderKanban, ChevronDown, ChevronUp,
  Calendar, Target, CheckCircle2, Clock, PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import {
  CATEGORIA_LABELS, CATEGORIA_ICONS, type ContaCategoria,
  type Projeto, type ProjetoItem,
} from '@/types';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/utils/format';

const STATUS_CONFIG = {
  planejado: { label: 'Planejado', icon: Clock, color: 'bg-muted text-muted-foreground' },
  em_andamento: { label: 'Em andamento', icon: PlayCircle, color: 'bg-primary/15 text-primary' },
  concluido: { label: 'Concluído', icon: CheckCircle2, color: 'bg-success/15 text-success' },
};

export default function ProjetosPage() {
  const { projetos, contas, addProjeto, updateProjeto, deleteProjeto } = useApp();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Projeto | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
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

  const openEdit = (projeto: Projeto) => {
    setEditing(projeto);
    setNome(projeto.nome);
    setDescricao(projeto.descricao);
    setOrcamento(formatCurrency(projeto.orcamento));
    setStatus(projeto.status);
    setItens(projeto.itens.map(({ id, ...rest }) => rest));
    setModalOpen(true);
  };

  const addItem = () => {
    setItens([...itens, { descricao: '', valorEstimado: 0, categoria: 'outros' }]);
  };

  const removeItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: unknown) => {
    const updated = [...itens];
    updated[index] = { ...updated[index], [field]: value };
    setItens(updated);
  };

  const totalItens = itens.reduce((s, i) => s + (i.valorEstimado || 0), 0);

  const handleSave = () => {
    if (!nome) {
      toast({ title: 'Informe o nome do projeto', variant: 'destructive' });
      return;
    }

    const data = {
      nome,
      descricao,
      orcamento: parseCurrencyInput(orcamento) || totalItens,
      status,
      itens: itens.map((item, i) => ({ ...item, id: editing?.itens[i]?.id || '' })),
      createdAt: editing?.createdAt || new Date().toISOString().split('T')[0],
    };

    if (editing) {
      updateProjeto(editing.id, data);
      toast({ title: 'Projeto atualizado!' });
    } else {
      addProjeto(data);
      toast({ title: 'Projeto criado!' });
    }
    setModalOpen(false);
    resetForm();
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

      {/* List */}
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
              const contasVinculadas = projeto.itens.filter(item => item.contaId).length;

              return (
                <motion.div
                  key={projeto.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
                >
                  {/* Header */}
                  <div
                    className="p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : projeto.id)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{projeto.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {projeto.itens.length} ite{projeto.itens.length !== 1 ? 'ns' : 'm'} · {contasVinculadas} vinculada(s)
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <p className="font-bold text-foreground">{formatCurrency(projeto.orcamento || totalProjeto)}</p>
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>

                  {/* Expanded Content */}
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

                          {/* Items */}
                          {projeto.itens.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Itens do Projeto</p>
                              {projeto.itens.map((item) => {
                                const contaVinculada = item.contaId ? contas.find(c => c.id === item.contaId) : null;
                                return (
                                  <div key={item.id} className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
                                    <span className="text-lg">{CATEGORIA_ICONS[item.categoria]}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground">{item.descricao}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {CATEGORIA_LABELS[item.categoria]}
                                        {contaVinculada && (
                                          <> · Vinculada: {contaVinculada.descricao}</>
                                        )}
                                      </p>
                                    </div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {formatCurrency(item.valorEstimado)}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Progress bar */}
                          {projeto.orcamento > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Estimado: {formatCurrency(totalProjeto)}</span>
                                <span>Orçamento: {formatCurrency(projeto.orcamento)}</span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full gradient-primary transition-all"
                                  style={{ width: `${Math.min((totalProjeto / projeto.orcamento) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 justify-end pt-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(projeto)} className="text-xs rounded-lg">
                              <Pencil className="w-3 h-3 mr-1" /> Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-destructive"
                              onClick={() => { deleteProjeto(projeto.id); toast({ title: 'Projeto removido' }); }}
                            >
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

      {/* Modal */}
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
              <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descreva o projeto..." rows={2} />
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

            {/* Itens */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Itens do Projeto</Label>
                <span className="text-xs text-muted-foreground">Total: {formatCurrency(totalItens)}</span>
              </div>

              {itens.map((item, i) => (
                <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Descrição do item"
                      value={item.descricao}
                      onChange={e => updateItem(i, 'descricao', e.target.value)}
                      className="flex-1"
                    />
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
                    <Input
                      placeholder="R$ 0,00"
                      value={item.valorEstimado ? formatCurrency(item.valorEstimado) : ''}
                      onChange={e => updateItem(i, 'valorEstimado', parseCurrencyInput(formatCurrencyInput(e.target.value)))}
                      className="w-28"
                    />
                    {/* Associate with existing conta */}
                    <Select
                      value={item.contaId || 'none'}
                      onValueChange={v => updateItem(i, 'contaId', v === 'none' ? undefined : v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Vincular conta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem vínculo</SelectItem>
                        {contas.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {CATEGORIA_ICONS[c.categoria]} {c.descricao} ({formatCurrency(c.valor)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
