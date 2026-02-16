import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIA_LABELS, type Conta, type ContaCategoria, type Investimento } from '@/types';
import { formatCurrencyInput, formatPhoneInput, parseCurrencyInput, formatCurrency } from '@/utils/format';

interface OnboardingConta {
  descricao: string;
  categoria: ContaCategoria;
  valor: string;
  diaVencimento: string;
}

export default function OnboardingPage() {
  const { user, updateUser, completeOnboarding } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  // Step 1
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState('');

  // Step 2
  const [salarioBruto, setSalarioBruto] = useState('');
  const [salarioLiquido, setSalarioLiquido] = useState('');

  // Step 3
  const [contasFixas, setContasFixas] = useState<OnboardingConta[]>([
    { descricao: '', categoria: 'moradia', valor: '', diaVencimento: '' },
  ]);

  // Step 4
  const [gastosVariaveis, setGastosVariaveis] = useState('');
  const [investimentoValor, setInvestimentoValor] = useState('');
  const [investimentoNome, setInvestimentoNome] = useState('');

  const steps = ['Dados Pessoais', 'Renda', 'Contas Fixas', 'Finalizar'];

  const bruto = parseCurrencyInput(salarioBruto);
  const liquido = parseCurrencyInput(salarioLiquido);
  const totalFixas = contasFixas.reduce((sum, c) => sum + parseCurrencyInput(c.valor), 0);

  const handleNext = () => {
    if (step === 0 && !name) {
      toast({ title: 'Informe seu nome', variant: 'destructive' });
      return;
    }
    if (step === 1 && (!bruto || !liquido)) {
      toast({ title: 'Informe sua renda', variant: 'destructive' });
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const handleFinish = () => {
    const now = new Date();
    const contas: Conta[] = contasFixas
      .filter(c => c.descricao && parseCurrencyInput(c.valor) > 0)
      .map((c, i) => ({
        id: `onb-${i}`,
        descricao: c.descricao,
        categoria: c.categoria,
        valor: parseCurrencyInput(c.valor),
        tipo: 'fixa' as const,
        diaVencimento: parseInt(c.diaVencimento) || 1,
        paga: false,
        mes: now.getMonth() + 1,
        ano: now.getFullYear(),
      }));

    const investimentos: Investimento[] = [];
    if (investimentoNome && parseCurrencyInput(investimentoValor) > 0) {
      investimentos.push({
        id: 'onb-inv-1',
        nome: investimentoNome,
        tipo: 'Geral',
        valor: parseCurrencyInput(investimentoValor),
        rentabilidade: 0,
      });
    }

    updateUser({
      name,
      phone,
      salarioBruto: bruto,
      salarioLiquido: liquido,
    });
    completeOnboarding({ contas, investimentos });
    toast({ title: 'Onboarding concluído! 🎉' });
    navigate('/dashboard');
  };

  const addContaFixa = () => {
    setContasFixas([...contasFixas, { descricao: '', categoria: 'outros', valor: '', diaVencimento: '' }]);
  };

  const removeContaFixa = (index: number) => {
    if (contasFixas.length > 1) {
      setContasFixas(contasFixas.filter((_, i) => i !== index));
    }
  };

  const updateContaFixa = (index: number, field: keyof OnboardingConta, value: string) => {
    const updated = [...contasFixas];
    updated[index] = { ...updated[index], [field]: value };
    setContasFixas(updated);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  i <= step
                    ? 'gradient-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 sm:w-16 h-0.5 mx-1 ${i < step ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">{steps[step]}</p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Dados Pessoais</h2>
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={email} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={phone}
                      onChange={e => setPhone(formatPhoneInput(e.target.value))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Sua Renda</h2>
                  <div className="space-y-2">
                    <Label>Salário Bruto</Label>
                    <Input
                      value={salarioBruto}
                      onChange={e => setSalarioBruto(formatCurrencyInput(e.target.value))}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salário Líquido</Label>
                    <Input
                      value={salarioLiquido}
                      onChange={e => setSalarioLiquido(formatCurrencyInput(e.target.value))}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  {bruto > 0 && liquido > 0 && (
                    <div className="bg-accent rounded-xl p-4 text-sm">
                      <p className="text-accent-foreground font-medium">
                        Diferença: {formatCurrency(bruto - liquido)}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {((1 - liquido / bruto) * 100).toFixed(1)}% retido em impostos e deduções
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Contas Fixas</h2>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {contasFixas.map((conta, i) => (
                      <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Descrição"
                            value={conta.descricao}
                            onChange={e => updateContaFixa(i, 'descricao', e.target.value)}
                            className="flex-1"
                          />
                          {contasFixas.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeContaFixa(i)} className="text-destructive shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Select value={conta.categoria} onValueChange={v => updateContaFixa(i, 'categoria', v)}>
                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="R$ 0,00"
                            value={conta.valor}
                            onChange={e => updateContaFixa(i, 'valor', formatCurrencyInput(e.target.value))}
                            className="w-28"
                          />
                          <Input
                            placeholder="Dia"
                            type="number"
                            min={1}
                            max={31}
                            value={conta.diaVencimento}
                            onChange={e => updateContaFixa(i, 'diaVencimento', e.target.value)}
                            className="w-16"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={addContaFixa} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Adicionar conta
                  </Button>
                  {totalFixas > 0 && (
                    <div className="bg-accent rounded-xl p-4 text-sm">
                      <p className="text-accent-foreground font-medium">
                        Total fixo: {formatCurrency(totalFixas)}/mês
                      </p>
                      {liquido > 0 && (
                        <p className="text-muted-foreground mt-1">
                          {((totalFixas / liquido) * 100).toFixed(1)}% do salário líquido
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Gastos Variáveis & Investimentos</h2>
                  <div className="space-y-2">
                    <Label>Estimativa de gastos variáveis/mês</Label>
                    <Input
                      value={gastosVariaveis}
                      onChange={e => setGastosVariaveis(formatCurrencyInput(e.target.value))}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="border-t border-border pt-4 space-y-2">
                    <Label>Investimento atual (opcional)</Label>
                    <Input
                      placeholder="Ex: Tesouro Selic"
                      value={investimentoNome}
                      onChange={e => setInvestimentoNome(e.target.value)}
                    />
                    <Input
                      placeholder="R$ 0,00"
                      value={investimentoValor}
                      onChange={e => setInvestimentoValor(formatCurrencyInput(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav Buttons */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={handleNext} className="flex-1 gradient-primary text-primary-foreground">
                Próximo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish} className="flex-1 gradient-primary text-primary-foreground">
                Finalizar <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
