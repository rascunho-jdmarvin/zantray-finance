import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, DollarSign, LogOut, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatCurrencyInput, formatPhoneInput, parseCurrencyInput } from '@/utils/format';

export default function PerfilPage() {
  const { user, updateUser, logout } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [salarioBruto, setSalarioBruto] = useState(user ? formatCurrency(user.salarioBruto) : '');
  const [salarioLiquido, setSalarioLiquido] = useState(user ? formatCurrency(user.salarioLiquido) : '');

  const handleSave = () => {
    updateUser({
      name,
      phone,
      salarioBruto: parseCurrencyInput(salarioBruto),
      salarioLiquido: parseCurrencyInput(salarioLiquido),
    });
    toast({ title: 'Perfil atualizado!' });
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Perfil</h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-5"
      >
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">
              {name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{name || 'Usuário'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="border-t border-border pt-5 space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><User className="w-4 h-4" /> Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</Label>
            <Input value={user?.email} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Phone className="w-4 h-4" /> Telefone</Label>
            <Input value={phone} onChange={e => setPhone(formatPhoneInput(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Salário Bruto</Label>
              <Input value={salarioBruto} onChange={e => setSalarioBruto(formatCurrencyInput(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Salário Líquido</Label>
              <Input value={salarioLiquido} onChange={e => setSalarioLiquido(formatCurrencyInput(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground rounded-xl">
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
          <Button variant="outline" onClick={handleLogout} className="text-destructive rounded-xl">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
