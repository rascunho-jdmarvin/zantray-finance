import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useFinance } from '@/contexts/FinanceContext';
import { formatCurrency, getMonthName } from '@/utils/format';
import { DESPESA_CATEGORIA_ICONS } from '@/types/finance';
import type { Despesa } from '@/types/finance';
import { cn } from '@/lib/utils';

export default function CalendarioPage() {
  const { despesas, parcelasProjetadas, togglePaga } = useFinance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // All events: regular despesas + projected installments (only future ones)
  const allEvents = useMemo(() => {
    const regular = despesas.filter(d => !d.parcelada);
    // For parceladas, use projected installments
    return [...regular, ...parcelasProjetadas];
  }, [despesas, parcelasProjetadas]);

  // Group by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, Despesa[]> = {};
    allEvents.forEach(d => {
      const dateKey = d.dataVencimento;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(d);
    });
    return map;
  }, [allEvents]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [year, month]);

  const getDateKey = (day: number) => {
    const d = new Date(year, month, day);
    return d.toISOString().split('T')[0];
  };

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendário</h1>
        <p className="text-muted-foreground text-sm mt-1">Visualize seus vencimentos no calendário</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prev}><ChevronLeft className="w-4 h-4" /></Button>
            <CardTitle className="text-base font-semibold">
              {getMonthName(month)} {year}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={next}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const dateKey = getDateKey(day);
              const events = eventsByDate[dateKey] || [];
              const hasEvents = events.length > 0;
              const allPaid = hasEvents && events.every(e => e.paga);
              const today = new Date();
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => hasEvents && setSelectedDay(dateKey)}
                  className={cn(
                    'relative flex flex-col items-center p-1 min-h-[56px] md:min-h-[72px] rounded-lg text-sm transition-colors',
                    isToday && 'ring-1 ring-primary',
                    hasEvents ? 'cursor-pointer hover:bg-muted' : 'cursor-default',
                  )}
                >
                  <span className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-foreground')}>
                    {day}
                  </span>
                  {hasEvents && (
                    <div className="mt-0.5 space-y-0.5 w-full">
                      {events.slice(0, 2).map((e, j) => (
                        <div
                          key={j}
                          className={cn(
                            'text-[9px] md:text-[10px] leading-tight truncate px-1 py-0.5 rounded',
                            e.paga ? 'bg-accent text-accent-foreground' : 'bg-warning/15 text-warning-foreground',
                          )}
                        >
                          {e.titulo.length > 10 ? e.titulo.slice(0, 10) + '…' : e.titulo}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <span className="text-[9px] text-muted-foreground">+{events.length - 2}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDayEvents.map(d => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span>{DESPESA_CATEGORIA_ICONS[d.categoria]}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.titulo}</p>
                    {d.parcelada && (
                      <p className="text-xs text-muted-foreground">Parcela {d.parcelaAtual}/{d.totalParcelas}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(d.valor)}</p>
                  <Button
                    size="sm"
                    variant={d.paga ? 'default' : 'outline'}
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      // Only toggle original despesas, not projected
                      const originalId = d.id.includes('-proj-') ? d.id.split('-proj-')[0] : d.id;
                      togglePaga(originalId);
                    }}
                  >
                    {d.paga ? <Check className="w-3 h-3" /> : 'Pagar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDay(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
