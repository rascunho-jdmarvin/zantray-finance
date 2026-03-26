import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ImportacaoWizard from '@/components/importacao/ImportacaoWizard';
import { useApp } from '@/contexts/AppContext';

const STATUS_CONFIG = {
  processando: { label: 'Processando', variant: 'secondary' as const },
  concluido: { label: 'Concluído', variant: 'default' as const },
  erro: { label: 'Erro', variant: 'destructive' as const },
  revisao_pendente: { label: 'Revisão', variant: 'outline' as const },
};

export default function ImportacaoPage() {
  const navigate = useNavigate();
  const { importacoes, removeImportacao } = useApp();

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importar Extrato</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Importe extratos bancários via IA</p>
        </div>
      </motion.div>

      {/* Wizard principal */}
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <ImportacaoWizard onComplete={() => navigate('/transacoes')} />
      </motion.div>

      {/* Histórico de importações */}
      {importacoes.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico</h2>
          </div>
          <div className="space-y-2">
            {importacoes.map(imp => {
              const config = STATUS_CONFIG[imp.status] ?? STATUS_CONFIG.concluido;
              return (
                <Card key={imp.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{imp.nomeArquivo}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(imp.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                        {imp.totalImportadas > 0 && ` · ${imp.totalImportadas} transações importadas`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => {
                          if (confirm(`Deletar importação "${imp.nomeArquivo}" e todas as suas transações?`)) {
                            removeImportacao(imp.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
