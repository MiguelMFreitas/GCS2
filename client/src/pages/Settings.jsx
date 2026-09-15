import React, { useState } from 'react';
import { Settings as SettingsIcon, Building, Fuel, Bell, Shield, Save, Check } from 'lucide-react';

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

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
          <SettingsIcon className="w-3.5 h-3.5" /> Parâmetros do Sistema
        </span>
        <h1 className="text-2xl font-black text-white">Configurações Gerais</h1>
        <p className="text-xs text-slate-400">Preferências da empresa, parâmetros de abastecimento e regras de auditoria.</p>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 max-w-3xl shadow-xl">
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
            <Shield className="w-4 h-4" /> Regras de Auditoria e Trava de Sessão (Item 46 & 47)
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoLockFinalized}
                onChange={(e) => setSettings({ ...settings, autoLockFinalized: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0"
              />
              <span className="text-slate-300">Bloquear alterações comuns em sessões finalizadas (exigindo justificativa e trilha de auditoria)</span>
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
          className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
        >
          <Save className="w-4 h-4" /> Salvar Configurações
        </button>
      </form>
    </div>
  );
}
