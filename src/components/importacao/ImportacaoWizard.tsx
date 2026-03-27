import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, Loader2, CheckCircle2, AlertTriangle,
  Check, X, ChevronDown, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useImportacao } from '@/hooks/useImportacao';
import { useBancos } from '@/hooks/useBancos';
import { CATEGORIA_LABELS, METODO_PAGAMENTO_LABELS, BANCO_TIPO_LABELS, type ContaCategoria, type BancoTipo, type TransacaoTipo } from '@/types';
import { formatCurrency } from '@/utils/format';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

interface ImportacaoWizardProps {
  onComplete?: () => void;
}

export default function ImportacaoWizard({ onComplete }: ImportacaoWizardProps) {
  const { projetos, refreshData } = useApp();
  const [showTips, setShowTips] = useState(false);
  const [showNovoBanco, setShowNovoBanco] = useState(false);
  const [novoBancoNome, setNovoBancoNome] = useState('');
  const [novoBancoTipo, setNovoBancoTipo] = useState<BancoTipo>('corrente');

  const {
    step, arquivo, itens, resultado, totalAprovados, totalDuplicatas,
    bancoId, setBancoId,
    iniciar, aprovarItem, editarItem, aprovarTodos, confirmar, reiniciar,
  } = useImportacao(async () => {
    await refreshData();
    onComplete?.();
  });

  const { bancos, createBanco, isCreating } = useBancos();

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) iniciar(accepted[0]);
  }, [iniciar]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: step !== 'idle',
  });

  // ── Passo 1: Drop Zone ────────────────────────────────
  if (step === 'idle') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h2 className="text-xl font-bold">Importar Extrato</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Envie seu extrato bancário em PDF ou CSV. A IA irá identificar as transações automaticamente.
          </p>
        </div>

        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-accent/30',
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-primary font-medium">Solte o arquivo aqui...</p>
          ) : (
            <>
              <p className="font-medium text-foreground">Arraste e solte seu extrato aqui</p>
              <p className="text-sm text-muted-foreground mt-1">ou clique para escolher o arquivo</p>
              <p className="text-xs text-muted-foreground mt-3">PDF, CSV ou TXT · máx. 10MB</p>
            </>
          )}
        </div>

        <button
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowTips(!showTips)}
        >
          <Info className="w-4 h-4" />
          Como funciona?
          <ChevronDown className={cn('w-4 h-4 transition-transform', showTips && 'rotate-180')} />
        </button>

        {showTips && (
          <div className="text-sm text-muted-foreground bg-accent/50 rounded-lg p-4 space-y-2">
            <p>1. Seu extrato é enviado de forma segura para nosso servidor.</p>
            <p>2. Uma IA analisa o documento e extrai as transações (data, valor, descrição, categoria).</p>
            <p>3. Você revisa e edita cada transação antes de confirmar.</p>
            <p>4. Somente após sua aprovação os dados são salvos.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Passo 2: Processando ──────────────────────────────
  if (step === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <div>
          <p className="font-semibold text-lg">Processando {arquivo?.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            A IA está identificando as transações. Isso pode levar alguns segundos...
          </p>
        </div>
        <Progress value={undefined} className="w-full" />
      </div>
    );
  }

  // ── Passo 3: Revisão ──────────────────────────────────
  if (step === 'reviewing') {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Revisar Transações</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {itens.length} transações encontradas · <span className="text-primary">{totalAprovados} aprovadas</span>
              {totalDuplicatas > 0 && <> · <span className="text-amber-500">{totalDuplicatas} possíveis duplicatas</span></>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => aprovarTodos(false)}>Desmarcar todas</Button>
            <Button variant="outline" size="sm" onClick={() => aprovarTodos(true)}>Aprovar todas</Button>
            <Button size="sm" onClick={confirmar} disabled={totalAprovados === 0}>
              Importar {totalAprovados} transações
            </Button>
          </div>
        </div>

        {/* Seletor de banco */}
        <div className="flex items-center gap-3 flex-wrap p-3 rounded-lg border border-border bg-muted/30">
          <span className="text-sm font-medium text-foreground">Banco / Cartão:</span>
          {!showNovoBanco ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={bancoId ?? '__none__'} onValueChange={v => setBancoId(v === '__none__' ? null : v)}>
                <SelectTrigger className="h-8 w-52 text-sm">
                  <SelectValue placeholder="Selecionar banco (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {bancos.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-primary"
                onClick={() => setShowNovoBanco(true)}>
                + Criar novo
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                className="h-8 w-40 text-sm"
                placeholder="Nome do banco"
                value={novoBancoNome}
                onChange={e => setNovoBancoNome(e.target.value)}
                autoFocus
              />
              <Select value={novoBancoTipo} onValueChange={v => setNovoBancoTipo(v as BancoTipo)}>
                <SelectTrigger className="h-8 w-40 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BANCO_TIPO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-xs"
                disabled={!novoBancoNome.trim() || isCreating}
                onClick={async () => {
                  const created = await createBanco({ nome: novoBancoNome.trim(), tipo: novoBancoTipo });
                  setBancoId(created.id);
                  setShowNovoBanco(false);
                  setNovoBancoNome('');
                  setNovoBancoTipo('corrente');
                }}>
                {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs"
                onClick={() => { setShowNovoBanco(false); setNovoBancoNome(''); }}>
                Cancelar
              </Button>
            </div>
          )}
          {bancoId && !showNovoBanco && (
            <span className="text-xs text-muted-foreground">
              Extrato vinculado a: <strong>{bancos.find(b => b.id === bancoId)?.nome}</strong>
            </span>
          )}
        </div>

        {totalDuplicatas > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Algumas transações podem já existir no sistema. Revise antes de aprovar.
          </div>
        )}

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox
                    checked={totalAprovados === itens.length && itens.length > 0}
                    onCheckedChange={c => aprovarTodos(!!c)}
                  />
                </TableHead>
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-28">Tipo</TableHead>
                <TableHead className="w-36">Categoria</TableHead>
                <TableHead className="w-32">Pagamento</TableHead>
                <TableHead className="w-40">Projeto</TableHead>
                <TableHead className="w-24 text-right">Valor</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    !item.aprovado && 'opacity-40',
                    item.possivelDuplicata && item.aprovado && 'bg-amber-50 dark:bg-amber-950/10',
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={item.aprovado}
                      onCheckedChange={c => aprovarItem(index, !!c)}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {new Date(item.data + 'T00:00').toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.possivelDuplicata && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Possível duplicata" />
                      )}
                      <Input
                        className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={item.descricaoEditada ?? item.descricao}
                        onChange={e => editarItem(index, { descricaoEditada: e.target.value })}
                        disabled={!item.aprovado}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.tipoEditado ?? (item.tipo === 'entrada' ? 'entrada' : 'saida')}
                      onValueChange={v => editarItem(index, { tipoEditado: v as TransacaoTipo })}
                      disabled={!item.aprovado}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saida">Saída</SelectItem>
                        <SelectItem value="entrada">Entrada</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.categoriaEditada ?? item.categoria}
                      onValueChange={v => editarItem(index, { categoriaEditada: v as ContaCategoria })}
                      disabled={!item.aprovado}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.metodoPagamento}
                      onValueChange={v => editarItem(index, { metodoPagamento: v as typeof item.metodoPagamento })}
                      disabled={!item.aprovado}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(METODO_PAGAMENTO_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.projetoId ?? '__none__'}
                      onValueChange={v => editarItem(index, { projetoId: v === '__none__' ? undefined : v })}
                      disabled={!item.aprovado}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {projetos.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {(p as { nome?: string; titulo?: string }).nome ?? (p as { titulo?: string }).titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    {formatCurrency(item.valor)}
                  </TableCell>
                  <TableCell>
                    {item.possivelDuplicata ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 px-1">
                        Duplicata?
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={cn('text-[10px] px-1', item.confiancaCategoria > 0.7 ? 'text-green-600 border-green-300' : 'text-muted-foreground')}>
                        {Math.round(item.confiancaCategoria * 100)}%
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={reiniciar}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={confirmar} disabled={totalAprovados === 0}>
            <Check className="w-4 h-4 mr-1" />
            Importar {totalAprovados} transações
          </Button>
        </div>
      </div>
    );
  }

  // ── Passo 4: Confirmando ──────────────────────────────
  if (step === 'confirming') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 max-w-md mx-auto text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="font-semibold">Salvando transações...</p>
      </div>
    );
  }

  // ── Passo 5: Concluído ────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 max-w-md mx-auto text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
        <CheckCircle2 className="w-9 h-9 text-green-600" />
      </div>
      <div>
        <p className="font-bold text-xl">Importação concluída!</p>
        <p className="text-muted-foreground mt-1">
          {resultado?.imported ?? 0} transações foram salvas com sucesso.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reiniciar}>Importar outro</Button>
        <Button onClick={onComplete}>Ver transações</Button>
      </div>
    </div>
  );
}
