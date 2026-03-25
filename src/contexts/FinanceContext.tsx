import React, { createContext, useContext, type ReactNode } from 'react';
import { useDespesas, useProjetos } from '@/hooks/useFinance';

type FinanceContextType = ReturnType<typeof useDespesas> & ReturnType<typeof useProjetos>;

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const despesasState = useDespesas();
  const projetosState = useProjetos();

  return (
    <FinanceContext.Provider value={{ ...despesasState, ...projetosState }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
