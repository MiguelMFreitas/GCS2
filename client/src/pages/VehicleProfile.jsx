import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Truck,
  Fuel,
  Edit,
  Wrench,
  DollarSign,
  FileText,
  Calendar,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Image as ImageIcon,
  Download,
  Upload,
  ShieldCheck,
  Building,
  User,
  ExternalLink,
  Ban,
  AlertOctagon,
  ShieldAlert
} from 'lucide-react';
import { vehicleService, expenseService, maintenanceService, documentService, reminderService } from '../services/api';
import { useFuelingCart } from '../context/FuelingCartContext';
import { getStatusBadge } from '../components/VehicleCard';
import StatusChangeModal from '../components/StatusChangeModal';
import VehicleFormModal from '../components/VehicleFormModal';
import FuelingModal from '../components/FuelingModal';

export default function VehicleProfile({ vehicleId, onBack, setActiveTab }) {
  const { refreshCart } = useFuelingCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveProfileTab] = useState('fuelings');

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [newExpenseOpen, setNewExpenseOpen] = useState(false);
  const [newMaintenanceOpen, setNewMaintenanceOpen] = useState(false);
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [newReminderOpen, setNewReminderOpen] = useState(false);
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState(null);

  // Delete & Deactivate Vehicle Flow (Item 1)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState(1); // 1 = choice (Deactivate vs Delete), 2 = hard delete plate confirmation
  const [typedPlateConfirmation, setTypedPlateConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Forms for inner tabs
  const [expenseForm, setExpenseForm] = useState({
    category: 'Troca de Óleo',
    description: '',
    date: new Date().toISOString().split('T')[0],
    cost: '',
    km: '',
    notes: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    type: 'Preventiva',
    problem: '',
    service: '',
    workshop: '',
    entry_date: new Date().toISOString().split('T')[0],
    exit_date: '',
    km: '',
    cost: '',
    parts: '',
    notes: '',
    update_vehicle_status: false
  });

  const [documentForm, setDocumentForm] = useState({
    name: '',
    doc_type: 'CRLV',
    issue_date: '',
    expiration_date: '',
    file_url: '',
    notes: ''
  });

  const [reminderForm, setReminderForm] = useState({
    title: '',
    category: 'Óleo',
    trigger_km: '',
    trigger_date: '',
    notes: ''
  });

  const loadVehicleData = async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const res = await vehicleService.get(vehicleId);
      setData(res.data);
    } catch (err) {
      console.error('Erro ao carregar dados do veículo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicleData();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const vehicle = data?.vehicle;
  const stats = data?.stats || {};
  const fuelings = data?.fuelings || [];
  const documents = data?.documents || [];
  const maintenances = data?.maintenances || [];
  const expenses = data?.expenses || [];
  const reminders = data?.reminders || [];

  if (!vehicle) {
    return (
      <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
        <p className="text-white font-bold">Veículo não encontrado.</p>
        <button onClick={onBack} className="text-xs text-emerald-400 font-bold hover:underline">
          Voltar para a lista de veículos
        </button>
      </div>
    );
  }

  const statusInfo = getStatusBadge(vehicle.status);
  const hasOdometer = vehicle.odometer_working === 1;

  // Deactivate Vehicle Action (Item 1)
  const handleDeactivate = async () => {
    setDeleting(true);
    try {
      await vehicleService.updateStatus(vehicle.id, {
        status: 'inactive',
        status_reason: 'Veículo desativado pelo usuário',
        justification: 'Desativação manual mantendo o histórico de abastecimentos e manutenções.'
      });
      setDeleteModalOpen(false);
      await refreshCart();
      loadVehicleData();
      alert(`O veículo ${vehicle.name} foi desativado com sucesso. Todo o histórico foi preservado.`);
    } catch (err) {
      alert('Erro ao desativar veículo.');
    } finally {
      setDeleting(false);
    }
  };

  // Delete Permanently Action (Item 1)
  const handleHardDelete = async () => {
    if (typedPlateConfirmation.trim().toUpperCase() !== vehicle.plate.trim().toUpperCase()) {
      alert(`Para confirmar a exclusão definitiva, digite a placa exatamente como cadastrada: ${vehicle.plate}`);
      return;
    }

    setDeleting(true);
    try {
      await vehicleService.delete(vehicle.id);
      setDeleteModalOpen(false);
      await refreshCart();
      alert(`Veículo ${vehicle.name} (${vehicle.plate}) apagado definitivamente com sucesso.`);
      if (onBack) onBack();
    } catch (err) {
      alert('Erro ao apagar veículo.');
    } finally {
      setDeleting(false);
    }
  };

  // Inner Tab Handlers
  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await expenseService.create({ ...expenseForm, vehicle_id: vehicle.id });
      setNewExpenseOpen(false);
      setExpenseForm({ category: 'Troca de Óleo', description: '', date: new Date().toISOString().split('T')[0], cost: '', km: '', notes: '' });
      loadVehicleData();
    } catch (err) {
      alert('Erro ao registrar despesa.');
    }
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    try {
      await maintenanceService.create({ ...maintenanceForm, vehicle_id: vehicle.id });
      setNewMaintenanceOpen(false);
      loadVehicleData();
    } catch (err) {
      alert('Erro ao registrar manutenção.');
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    try {
      await documentService.create({
        ...documentForm,
        vehicle_id: vehicle.id,
        file_url: documentForm.file_url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      });
      setNewDocumentOpen(false);
      loadVehicleData();
    } catch (err) {
      alert('Erro ao anexar documento.');
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    try {
      await reminderService.create({ ...reminderForm, vehicle_id: vehicle.id });
      setNewReminderOpen(false);
      loadVehicleData();
    } catch (err) {
      alert('Erro ao cadastrar lembrete.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Veículos
        </button>
      </div>

      {/* Main Vehicle Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          
          {/* Left: Photo + Name & Plate */}
          <div className="flex items-start gap-5">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-800 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center shadow-lg">
              {vehicle.photo_url ? (
                <img src={vehicle.photo_url} alt={vehicle.name} className="w-full h-full object-cover" />
              ) : (
                <Truck className="w-12 h-12 text-slate-500" />
              )}
            </div>

            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                  <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                  {statusInfo.label}
                </span>

                <button
                  onClick={() => setStatusModalOpen(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2"
                >
                  Alterar Situação
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {vehicle.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="font-mono bg-white text-slate-900 px-2 py-0.5 rounded font-black border border-slate-300 shadow-sm">
                  {vehicle.plate}
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded font-medium">
                  {vehicle.brand} {vehicle.model} {vehicle.version || ''}
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded font-medium">
                  {vehicle.year_fab}/{vehicle.year_model}
                </span>
                <span className="bg-slate-800/60 px-2 py-0.5 rounded font-medium text-slate-400">
                  Tanque ~{vehicle.tank_capacity || 80}L ({vehicle.fuel_type_default})
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start">
            <button
              onClick={() => setFuelModalOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
            >
              <Fuel className="w-4 h-4" /> Registrar Abastecimento
            </button>
            <button
              onClick={() => setEditModalOpen(true)}
              className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Edit className="w-4 h-4" /> Editar
            </button>
          </div>
        </div>

        {/* Aggregated KPI Cards for Vehicle */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Última KM Registrada</span>
            <p className="text-base sm:text-lg font-black text-white mt-0.5">
              {hasOdometer ? (stats.current_km ? `${Number(stats.current_km).toLocaleString('pt-BR')} km` : 'Sem registros') : 'Odômetro Não Funcional'}
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Média de Consumo</span>
            <p className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
              {hasOdometer && stats.avg_consumption_kml ? `${stats.avg_consumption_kml} km/L` : <span className="text-slate-500 italic text-xs">Não calculado</span>}
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Custo Médio / KM</span>
            <p className="text-base sm:text-lg font-black text-blue-400 mt-0.5">
              {hasOdometer && stats.avg_cost_per_km ? `R$ ${stats.avg_cost_per_km}/km` : '—'}
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Total de Abastecimentos</span>
            <p className="text-base sm:text-lg font-black text-white mt-0.5">
              {stats.total_fuelings || 0} ({stats.total_liters || 0} L)
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 col-span-2 lg:col-span-1">
            <span className="text-[11px] text-slate-400 block font-medium">Total Gasto Acumulado</span>
            <p className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
              R$ {Number(stats.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'fuelings', label: `Histórico de Abastecimentos (${fuelings.length})`, icon: Fuel },
          { id: 'details', label: 'Ficha e Documentação', icon: FileText },
          { id: 'documents', label: `Documentos & Anexos (${documents.length})`, icon: ShieldCheck },
          { id: 'maintenance', label: `Manutenções (${maintenances.length})`, icon: Wrench },
          { id: 'expenses', label: `Despesas (${expenses.length})`, icon: DollarSign },
          { id: 'reminders', label: `Lembretes (${reminders.length})`, icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveProfileTab(tab.id)}
              className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Fuelings History */}
      {activeTab === 'fuelings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Registros de Abastecimento do Veículo</h3>
          </div>

          {fuelings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {fuelings.map((f) => (
                <div
                  key={f.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3 hover:border-slate-700 transition-colors shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      {f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : 'Data não informada'}
                    </span>
                    {f.session_code && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                        Sessão: {f.session_code}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Litros</span>
                      <strong className="text-white">⛽ {f.liters} L</strong>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Valor</span>
                      <strong className="text-emerald-400">💰 R$ {Number(f.total_cost).toFixed(2)}</strong>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">KM Rodados</span>
                      <strong className="text-blue-400">🛣 {f.km_driven ? `${f.km_driven} km` : '-'}</strong>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Consumo</span>
                      <strong className="text-emerald-300">📊 {f.consumption_kml ? `${f.consumption_kml} km/L` : '-'}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>Combustível: {f.fuel_type} • Posto: {f.fuel_station || '-'}</span>
                    <div className="flex items-center gap-2">
                      {f.photo_pump_url && (
                        <button
                          onClick={() => setSelectedPhotoZoom(f.photo_pump_url)}
                          className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                          <ImageIcon className="w-3 h-3" /> Bomba
                        </button>
                      )}
                      {f.photo_dashboard_url && (
                        <button
                          onClick={() => setSelectedPhotoZoom(f.photo_dashboard_url)}
                          className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                          <ImageIcon className="w-3 h-3" /> Painel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-xs text-slate-500">
              Nenhum abastecimento registrado para este veículo.
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Ficha e Configurações (com Botão de Apagar - Item 1) */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">RENAVAM</span>
                <strong className="text-white text-sm font-mono">{vehicle.renavam || 'Não informado'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Chassi</span>
                <strong className="text-white text-sm font-mono">{vehicle.chassi || 'Não informado'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Número CRLV</span>
                <strong className="text-white text-sm font-mono">{vehicle.crlv_number || 'Não informado'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 sm:col-span-2">
                <span className="text-slate-400 block mb-1">Proprietário</span>
                <strong className="text-white text-sm">{vehicle.owner_name || 'GCS Logística'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">CPF / CNPJ</span>
                <strong className="text-white text-sm">{vehicle.owner_doc || '-'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Município / UF</span>
                <strong className="text-white text-sm">{vehicle.city || 'São Paulo'} - {vehicle.uf || 'SP'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Licenciamento / Exercício</span>
                <strong className="text-white text-sm">{vehicle.license_year || 2026}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Odômetro</span>
                <strong className={hasOdometer ? 'text-emerald-400 text-sm' : 'text-amber-400 text-sm'}>
                  {hasOdometer ? 'Funcional ✅' : 'Não Funcional ❌'}
                </strong>
              </div>
            </div>

            {vehicle.notes && (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                <span className="font-bold text-slate-300 block mb-1">Observações Gerais:</span>
                <p className="text-slate-400">{vehicle.notes}</p>
              </div>
            )}
          </div>

          {/* Área de Gerenciamento & Exclusão Protegida (Item 1) */}
          <div className="bg-slate-900 border border-rose-900/30 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Gerenciamento e Exclusão do Veículo</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Você pode desativar este veículo para retirá-lo das operações ativas mantendo todo o histórico de abastecimentos e manutenções, ou apagá-lo definitivamente do banco de dados.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmStep(1);
                  setTypedPlateConfirmation('');
                  setDeleteModalOpen(true);
                }}
                className="py-3 px-5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-2 transition-colors active:scale-95"
              >
                <Trash2 className="w-4 h-4" /> 🗑️ Apagar veículo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Documentos e Comprovantes Anexados</h3>
            <button
              onClick={() => setNewDocumentOpen(true)}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Anexar Documento
            </button>
          </div>

          {documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((d) => (
                <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{d.name}</h4>
                      <span className="text-xs text-slate-400">Tipo: {d.doc_type}</span>
                    </div>
                    {d.expiration_date && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        d.is_expired ? 'bg-rose-500/20 text-rose-300' : (d.is_expiring_soon ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300')
                      }`}>
                        Vencimento: {d.expiration_date}
                      </span>
                    )}
                  </div>
                  {d.file_url && (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-400 font-semibold inline-flex items-center gap-1 hover:underline pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Visualizar Documento
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-xs text-slate-500">
              Nenhum documento anexado ainda.
            </div>
          )}
        </div>
      )}

      {/* Tab Content 4: Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Histórico de Manutenções e Oficinas</h3>
            <button
              onClick={() => setNewMaintenanceOpen(true)}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar Manutenção
            </button>
          </div>

          {maintenances.length > 0 ? (
            <div className="space-y-3">
              {maintenances.map((m) => (
                <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{m.problem}</span>
                    <span className="text-xs font-bold text-emerald-400">
                      R$ {Number(m.cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Oficina: <strong className="text-slate-200">{m.workshop || 'Interna'}</strong> • Entrada: {m.entry_date} {m.exit_date ? `• Saída: ${m.exit_date}` : '• Em andamento'}
                  </p>
                  {m.service && <p className="text-xs text-slate-300">Serviço: {m.service}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-xs text-slate-500">
              Nenhum registro de manutenção para este veículo.
            </div>
          )}
        </div>
      )}

      {/* Tab Content 5: Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Despesas e Peças (Óleo, Pneus, IPVA, etc.)</h3>
            <button
              onClick={() => setNewExpenseOpen(true)}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar Despesa
            </button>
          </div>

          {expenses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {expenses.map((exp) => (
                <div key={exp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold bg-slate-800 text-emerald-400 px-2 py-0.5 rounded">
                      {exp.category}
                    </span>
                    <strong className="text-sm text-white">
                      R$ {Number(exp.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <p className="text-xs text-slate-300">{exp.description}</p>
                  <span className="text-[11px] text-slate-500 block">Data: {exp.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-xs text-slate-500">
              Nenhuma despesa avulsa registrada.
            </div>
          )}
        </div>
      )}

      {/* Tab Content 6: Reminders */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Lembretes Preventivos por KM ou Data</h3>
            <button
              onClick={() => setNewReminderOpen(true)}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Criar Lembrete
            </button>
          </div>

          {reminders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reminders.map((r) => (
                <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white">{r.title}</h4>
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">
                      {r.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-0.5">
                    {r.trigger_km && <p>Alerta na KM: <strong className="text-white">{Number(r.trigger_km).toLocaleString('pt-BR')} km</strong></p>}
                    {r.trigger_date && <p>Alerta na data: <strong className="text-white">{r.trigger_date}</strong></p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-xs text-slate-500">
              Nenhum lembrete ativo.
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <StatusChangeModal
        vehicle={vehicle}
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onUpdated={loadVehicleData}
      />

      <VehicleFormModal
        isOpen={editModalOpen}
        vehicleToEdit={vehicle}
        onClose={() => setEditModalOpen(false)}
        onSaved={loadVehicleData}
      />

      <FuelingModal
        vehicle={vehicle}
        isOpen={fuelModalOpen}
        onClose={() => setFuelModalOpen(false)}
        onNextVehicle={() => {
          setFuelModalOpen(false);
          loadVehicleData();
        }}
        onViewCart={() => {
          setFuelModalOpen(false);
          if (setActiveTab) setActiveTab('cart');
        }}
      />

      {/* Modal para Apagar / Desativar Veículo (Item 1) */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-7 w-full max-w-lg space-y-5 shadow-2xl">
            
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Tem certeza que deseja apagar este veículo?
                </h3>
                <p className="text-xs text-rose-300 font-semibold mt-1">
                  “Essa ação poderá apagar também os dados relacionados ao veículo.”
                </p>
              </div>
            </div>

            {/* Vehicle Info Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Nome do Veículo:</span>
                <strong className="text-white">{vehicle.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Placa:</span>
                <strong className="text-emerald-400 font-mono">{vehicle.plate}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ano Fabricação / Modelo:</span>
                <strong className="text-white">{vehicle.year_fab}/{vehicle.year_model}</strong>
              </div>
            </div>

            {confirmStep === 1 ? (
              /* Step 1: Choice between Deactivate vs Delete */
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-300 font-medium">Escolha como deseja proceder:</p>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Option 1: Desativar Veículo */}
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={deleting}
                    className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition-colors flex items-start gap-3 group"
                  >
                    <Ban className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 block">
                        🟡 Desativar veículo (Recomendado)
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        O veículo é retirado do abastecimento semanal, mas todo o histórico e relatórios continuam preservados.
                      </span>
                    </div>
                  </button>

                  {/* Option 2: Apagar Definitivamente */}
                  <button
                    type="button"
                    onClick={() => setConfirmStep(2)}
                    className="p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 text-left transition-colors flex items-start gap-3 group"
                  >
                    <Trash2 className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-rose-300 group-hover:text-rose-200 block">
                        🔴 Apagar definitivamente
                      </span>
                      <span className="text-[11px] text-rose-300/70 mt-0.5 block">
                        Exclui o registro do veículo e todos os seus vínculos permanentemente do banco de dados.
                      </span>
                    </div>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Second confirmation for Permanent Delete */
              <div className="space-y-4 pt-2">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  ⚠️ <strong>Segunda Confirmação Obrigatória:</strong> Digite a placa <strong>{vehicle.plate}</strong> abaixo para confirmar a exclusão definitiva:
                </div>

                <input
                  type="text"
                  placeholder={`Digite ${vehicle.plate}`}
                  value={typedPlateConfirmation}
                  onChange={(e) => setTypedPlateConfirmation(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-rose-500/50 text-white font-mono font-bold text-center uppercase focus:outline-none"
                />

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmStep(1)}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleHardDelete}
                    disabled={deleting || typedPlateConfirmation.trim() !== vehicle.plate.trim()}
                    className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg disabled:opacity-40"
                  >
                    {deleting ? 'Apagando...' : 'Confirmar Exclusão Definitiva'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nova Despesa */}
      {newExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Registrar Despesa</h3>
            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
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
                  placeholder="Ex: 2 Pneus novos Bridgestone"
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
                    placeholder="450.00"
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
                  onClick={() => setNewExpenseOpen(false)}
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

      {/* Photo Zoom Modal */}
      {selectedPhotoZoom && (
        <div
          onClick={() => setSelectedPhotoZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 cursor-pointer"
        >
          <div className="max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
            <img src={selectedPhotoZoom} alt="Visualização" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
