import React, { useState, useEffect } from 'react';
import {
  Wrench,
  DollarSign,
  Plus,
  Search,
  Filter,
  Calendar,
  Truck,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { expenseService, maintenanceService, vehicleService, uploadService } from '../services/api';

export default function Expenses() {
  const [activeTab, setActiveTab] = useState('expenses');
  const [expenses, setExpenses] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [newExpenseModal, setNewExpenseModal] = useState(false);
  const [newMaintenanceModal, setNewMaintenanceModal] = useState(false);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    vehicle_id: '',
    category: 'Troca de Óleo',
    description: '',
    date: new Date().toISOString().split('T')[0],
    cost: '',
    km: '',
    receipt_url: '',
    notes: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    vehicle_id: '',
    type: 'Preventiva',
    problem: '',
    service: '',
    workshop: '',
    entry_date: new Date().toISOString().split('T')[0],
    exit_date: '',
    km: '',
    cost: '',
    parts: '',
    receipt_url: '',
    notes: '',
    update_vehicle_status: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, mainRes, vehRes] = await Promise.all([
        expenseService.list(),
        maintenanceService.list(),
        vehicleService.list()
      ]);
      setExpenses(expRes.data.expenses || []);
      setMaintenances(mainRes.data.records || []);
      setVehicles(vehRes.data.vehicles || []);
      if (vehRes.data.vehicles?.length > 0) {
        setExpenseForm(prev => ({ ...prev, vehicle_id: vehRes.data.vehicles[0].id }));
        setMaintenanceForm(prev => ({ ...prev, vehicle_id: vehRes.data.vehicles[0].id }));
      }
    } catch (err) {
      console.error('Erro ao carregar despesas e manutenções:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      await expenseService.create(expenseForm);
      setNewExpenseModal(false);
      loadData();
    } catch (err) {
      alert('Erro ao registrar despesa.');
    }
  };

  const handleCreateMaintenance = async (e) => {
    e.preventDefault();
    try {
      await maintenanceService.create(maintenanceForm);
      setNewMaintenanceModal(false);
      loadData();
    } catch (err) {
      alert('Erro ao registrar manutenção.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
            <Wrench className="w-3.5 h-3.5" /> Custos & Manutenções
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Despesas e Manutenções da Frota
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Controle de serviços mecânicos, oficinas, peças, pneus, óleos e taxas veiculares.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewExpenseModal(true)}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <DollarSign className="w-4 h-4 text-emerald-400" /> + Nova Despesa
          </button>
          <button
            onClick={() => setNewMaintenanceModal(true)}
            className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-colors"
          >
            <Wrench className="w-4 h-4" /> + Nova Manutenção
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'expenses'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Despesas da Frota ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'maintenance'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wrench className="w-4 h-4" /> Manutenções e Oficinas ({maintenances.length})
        </button>
      </div>

      {/* Tab 1: Despesas */}
      {activeTab === 'expenses' && (
        <div className="space-y-3">
          {expenses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {expenses.map((exp) => (
                <div key={exp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold bg-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-full">
                      {exp.category}
                    </span>
                    <strong className="text-base text-emerald-400 font-black">
                      R$ {Number(exp.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-white">{exp.description}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-500" />
                      {exp.vehicle_name} ({exp.vehicle_plate})
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    <span>Data: {exp.date}</span>
                    {exp.km && <span>KM: {Number(exp.km).toLocaleString('pt-BR')} km</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-xs text-slate-500">
              Nenhuma despesa cadastrada no momento.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Manutenções */}
      {activeTab === 'maintenance' && (
        <div className="space-y-3">
          {maintenances.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {maintenances.map((m) => (
                <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                      Manutenção {m.type}
                    </span>
                    <strong className="text-base text-white font-black">
                      R$ {Number(m.cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div>
                    <h4 className="font-bold text-base text-white">{m.problem}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Veículo: <strong className="text-slate-200">{m.vehicle_name} ({m.vehicle_plate})</strong>
                    </p>
                    <p className="text-xs text-slate-400">
                      Oficina: <strong className="text-slate-200">{m.workshop || 'Não informada'}</strong>
                    </p>
                    {m.service && <p className="text-xs text-slate-300 mt-1">Serviço: {m.service}</p>}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    <span>Entrada: {m.entry_date}</span>
                    <span>{m.exit_date ? `Saída: ${m.exit_date}` : 'Em andamento'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-xs text-slate-500">
              Nenhum registro de manutenção no momento.
            </div>
          )}
        </div>
      )}

      {/* Modal Nova Despesa */}
      {newExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Registrar Nova Despesa</h3>
            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Veículo</label>
                <select
                  value={expenseForm.vehicle_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Categoria</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="Troca de Óleo">Troca de Óleo</option>
                  <option value="Pneus">Pneus</option>
                  <option value="Bateria">Bateria</option>
                  <option value="Mecânica">Mecânica</option>
                  <option value="Elétrica">Elétrica</option>
                  <option value="Peças">Peças</option>
                  <option value="Multas">Multas</option>
                  <option value="IPVA">IPVA</option>
                  <option value="Licenciamento">Licenciamento</option>
                  <option value="Seguro">Seguro</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Troca de 4 filtros e óleo lubrificante"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="350.00"
                    value={expenseForm.cost}
                    onChange={(e) => setExpenseForm({ ...expenseForm, cost: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Data</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewExpenseModal(false)}
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-400 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Manutenção */}
      {newMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Registrar Manutenção</h3>
            <form onSubmit={handleCreateMaintenance} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Veículo</label>
                <select
                  value={maintenanceForm.vehicle_id}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tipo</label>
                <select
                  value={maintenanceForm.type}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="Preventiva">Preventiva</option>
                  <option value="Corretiva">Corretiva</option>
                  <option value="Revisão">Revisão Periódica</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Problema / Motivo</label>
                <input
                  type="text"
                  placeholder="Ex: Embreagem patinando"
                  value={maintenanceForm.problem}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, problem: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Oficina</label>
                <input
                  type="text"
                  placeholder="Oficina Mecânica Diesel Tech"
                  value={maintenanceForm.workshop}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, workshop: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Custo Estimado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1200.00"
                    value={maintenanceForm.cost}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Data de Entrada</label>
                  <input
                    type="date"
                    value={maintenanceForm.entry_date}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, entry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="updateStatus"
                  checked={maintenanceForm.update_vehicle_status}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, update_vehicle_status: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0"
                />
                <label htmlFor="updateStatus" className="text-slate-300">
                  Alterar situação do veículo para "🟡 Em manutenção"
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewMaintenanceModal(false)}
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-400 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  Salvar Manutenção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
