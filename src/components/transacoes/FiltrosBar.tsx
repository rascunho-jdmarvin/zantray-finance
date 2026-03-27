import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, X, SlidersHorizontal, Search } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { CATEGORIA_LABELS, METODO_PAGAMENTO_LABELS, type ContaCategoria, type MetodoPagamento, type Banco } from '@/types';
import type { TransacoesFiltros, DateRangePreset } from '@/types/transactions';

interface FiltrosBarProps {
  filtros: TransacoesFiltros;
  onFiltrosChange: (f: TransacoesFiltros) => void;
  onClear: () => void;
  hasActive: boolean;
  bancos?: Banco[];
}

function getPresetRange(preset: DateRangePreset): { inicio: string; fim: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  if (preset === 'mes_atual') {
    return {
      inicio: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
      fim: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  if (preset === 'mes_passado') {
    return {
      inicio: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      fim: fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  return {
    inicio: fmt(new Date(now.getFullYear(), 0, 1)),
    fim: fmt(new Date(now.getFullYear(), 11, 31)),
  };
}

const CATEGORIAS = Object.entries(CATEGORIA_LABELS) as [ContaCategoria, string][];
const METODOS = Object.entries(METODO_PAGAMENTO_LABELS) as [MetodoPagamento, string][];

export default function FiltrosBar({ filtros, onFiltrosChange, onClear, hasActive, bancos }: FiltrosBarProps) {
  const { projetos } = useApp();
  const [dateOpen, setDateOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [metodoOpen, setMetodoOpen] = useState(false);

  const dateRange: DateRange | undefined = filtros.dataInicio
    ? { from: new Date(filtros.dataInicio + 'T00:00'), to: filtros.dataFim ? new Date(filtros.dataFim + 'T00:00') : undefined }
    : undefined;

  const handleDateRange = (range: DateRange | undefined) => {
    onFiltrosChange({
      ...filtros,
      dataInicio: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
      dataFim: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
    });
  };

  const handlePreset = (preset: DateRangePreset) => {
    const { inicio, fim } = getPresetRange(preset);
    onFiltrosChange({ ...filtros, dataInicio: inicio, dataFim: fim });
    setDateOpen(false);
  };

  const toggleCategoria = (cat: ContaCategoria) => {
    const atual = filtros.categorias ?? [];
    const novas = atual.includes(cat) ? atual.filter(c => c !== cat) : [...atual, cat];
    onFiltrosChange({ ...filtros, categorias: novas.length ? novas : undefined });
  };

  const toggleMetodo = (m: MetodoPagamento) => {
    const atual = filtros.metodosPagamento ?? [];
    const novos = atual.includes(m) ? atual.filter(x => x !== m) : [...atual, m];
    onFiltrosChange({ ...filtros, metodosPagamento: novos.length ? novos : undefined });
  };

  const labelData = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, 'dd/MM', { locale: ptBR })} – ${format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}`
      : format(dateRange.from, 'dd/MM/yy', { locale: ptBR })
    : 'Data';

  const catCount = filtros.categorias?.length ?? 0;
  const metCount = filtros.metodosPagamento?.length ?? 0;

  return (
    <div className="space-y-3">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por descrição..."
          value={filtros.busca ?? ''}
          onChange={e => onFiltrosChange({ ...filtros, busca: e.target.value || undefined })}
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />

        {/* Data */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={dateRange ? 'default' : 'outline'}
              size="sm"
              className={cn('gap-1.5', dateRange && 'bg-primary text-primary-foreground')}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              {labelData}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex gap-1 p-2 border-b">
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => handlePreset('mes_atual')}>Mês Atual</Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => handlePreset('mes_passado')}>Mês Passado</Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => handlePreset('ano_atual')}>Ano Atual</Button>
            </div>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRange}
              locale={ptBR}
              numberOfMonths={2}
            />
            {dateRange && (
              <div className="p-2 border-t">
                <Button size="sm" variant="ghost" className="w-full text-xs text-destructive" onClick={() => handleDateRange(undefined)}>
                  Limpar data
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Tipo entrada/saída */}
        <Select
          value={filtros.tipo ?? 'todas'}
          onValueChange={v => onFiltrosChange({ ...filtros, tipo: v as TransacoesFiltros['tipo'] })}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Entradas e saídas</SelectItem>
            <SelectItem value="entrada">Só entradas</SelectItem>
            <SelectItem value="saida">Só saídas</SelectItem>
          </SelectContent>
        </Select>

        {/* Categorias */}
        <Popover open={catOpen} onOpenChange={setCatOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={catCount > 0 ? 'default' : 'outline'}
              size="sm"
              className={cn(catCount > 0 && 'bg-primary text-primary-foreground')}
            >
              Categoria{catCount > 0 && ` (${catCount})`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {CATEGORIAS.map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer"
                  onClick={() => toggleCategoria(key)}>
                  <Checkbox checked={filtros.categorias?.includes(key) ?? false} onCheckedChange={() => toggleCategoria(key)} />
                  <Label className="cursor-pointer text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Meio de Pagamento */}
        <Popover open={metodoOpen} onOpenChange={setMetodoOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={metCount > 0 ? 'default' : 'outline'}
              size="sm"
              className={cn(metCount > 0 && 'bg-primary text-primary-foreground')}
            >
              Pagamento{metCount > 0 && ` (${metCount})`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1">
              {METODOS.map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer"
                  onClick={() => toggleMetodo(key)}>
                  <Checkbox checked={filtros.metodosPagamento?.includes(key) ?? false} onCheckedChange={() => toggleMetodo(key)} />
                  <Label className="cursor-pointer text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Projeto */}
        {projetos.length > 0 && (
          <Select
            value={filtros.projetoId ?? '__todos__'}
            onValueChange={v => onFiltrosChange({ ...filtros, projetoId: v === '__todos__' ? undefined : v })}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos projetos</SelectItem>
              {projetos.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {(p as { nome?: string }).nome ?? p.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Banco */}
        {bancos && bancos.length > 0 && (
          <Select
            value={filtros.bancoId ?? '__todos__'}
            onValueChange={v => onFiltrosChange({ ...filtros, bancoId: v === '__todos__' ? undefined : v })}
          >
            <SelectTrigger className={`h-8 w-40 text-xs ${filtros.bancoId ? 'border-primary' : ''}`}>
              <SelectValue placeholder="Banco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos os bancos</SelectItem>
              {bancos.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Transferências */}
        <div
          className="flex items-center gap-1.5 cursor-pointer"
          onClick={() => onFiltrosChange({ ...filtros, excluirTransferencias: !filtros.excluirTransferencias })}
        >
          <Checkbox checked={!filtros.excluirTransferencias} />
          <Label className="cursor-pointer text-xs text-muted-foreground whitespace-nowrap">Ver transferências</Label>
        </div>

        {hasActive && (
          <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={onClear}>
            <X className="w-3.5 h-3.5" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Badges dos filtros ativos */}
      {hasActive && (
        <div className="flex flex-wrap gap-1.5">
          {filtros.categorias?.map(c => (
            <Badge key={c} variant="secondary" className="gap-1 text-xs">
              {CATEGORIA_LABELS[c]}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleCategoria(c)} />
            </Badge>
          ))}
          {filtros.metodosPagamento?.map(m => (
            <Badge key={m} variant="secondary" className="gap-1 text-xs">
              {METODO_PAGAMENTO_LABELS[m]}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleMetodo(m)} />
            </Badge>
          ))}
          {filtros.bancoId && bancos && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {bancos.find(b => b.id === filtros.bancoId)?.nome ?? 'Banco'}
              <X className="w-3 h-3 cursor-pointer" onClick={() => onFiltrosChange({ ...filtros, bancoId: undefined })} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
