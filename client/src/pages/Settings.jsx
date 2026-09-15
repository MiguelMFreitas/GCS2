import React, { useState } from 'react';
import { Settings as SettingsIcon, Building, Fuel, Shield, Save, Check, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/api';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    companyName: 'GCS Logística e Transportes Ltda',
    cnpj: '12.345.678/0001-90',
    fuelingDay: 'Segunda-feira',
    defaultFuelStation: 'Posto Shell Bandeirantes',
    dieselBenchmarkPrice: '6.97',
    gasolineBenchmarkPrice: '6.19',
    ethanolBenchmarkPrice: '4.29',
    autoLockFinalized: true,
    requirePhotos: true
  });

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 6) {
      setPwError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    setPwLoading(true);
    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword
      });
      setPwSuccess(res.data?.message || 'Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(''), 5000);
    } catch (err) {
      setPwError(err.response?.data?.error || 'Erro ao alterar a senha. Verifique a senha atual.');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
          <SettingsIcon className="w-3.5 h-3.5" /> Parâmetros do Sistema
        </span>
        <h1 className="text-2xl font-black text-white">Configurações Gerais</h1>
        <p className="text-xs text-slate-400">Preferências da empresa, parâmetros de abastecimento e segurança da conta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Settings Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          {saved && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" /> Configurações salvas com sucesso!
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-4 h-4" /> Dados da Empresa
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Razão Social</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">CNPJ</label>
                <input
                  type="text"
                  value={settings.cnpj}
                  onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Fuel className="w-4 h-4" /> Preços de Referência (R$/L)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Diesel S10 Médio</label>
                <input
                  type="text"
                  value={settings.dieselBenchmarkPrice}
                  onChange={(e) => setSettings({ ...settings, dieselBenchmarkPrice: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Gasolina Média</label>
                <input
                  type="text"
                  value={settings.gasolineBenchmarkPrice}
                  onChange={(e) => setSettings({ ...settings, gasolineBenchmarkPrice: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Etanol Médio</label>
                <input
                  type="text"
                  value={settings.ethanolBenchmarkPrice}
                  onChange={(e) => setSettings({ ...settings, ethanolBenchmarkPrice: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Regras de Auditoria e Trava de Sessão
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoLockFinalized}
                  onChange={(e) => setSettings({ ...settings, autoLockFinalized: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0"
                />
                <span className="text-slate-300">Bloquear alterações comuns em sessões finalizadas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requirePhotos}
                  onChange={(e) => setSettings({ ...settings, requirePhotos: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0"
                />
                <span className="text-slate-300">Exigir foto da bomba em todos os abastecimentos</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Save className="w-4 h-4" /> Salvar Configurações
          </button>
        </form>

        {/* Change Password Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl h-fit">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
              <KeyRound className="w-3.5 h-3.5" /> Segurança
            </span>
            <h2 className="text-lg font-bold text-white">Alterar Senha</h2>
            <p className="text-xs text-slate-400">Atualize a senha da sua conta de acesso.</p>
          </div>

          {pwError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pwError}</span>
            </div>
          )}

          {pwSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{pwSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Senha Atual</label>
              <input
                type="password"
                placeholder="Informe sua senha atual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Nova Senha</label>
              <input
                type="password"
                placeholder="Mínimo de 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Confirmar Nova Senha</label>
              <input
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              {pwLoading ? 'Atualizando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
