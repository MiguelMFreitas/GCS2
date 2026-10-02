import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Truck,
  Fuel,
  Edit,
  FileText,
  Calendar,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Ban,
  AlertOctagon,
  Eye,
  Building,
  User,
  X
} from 'lucide-react';
import { vehicleService } from '../services/api';
import { useFuelingCart } from '../context/FuelingCartContext';
import StatusChangeModal from '../components/StatusChangeModal';
import VehicleFormModal from '../components/VehicleFormModal';
import FuelingModal from '../components/FuelingModal';
import DeleteFuelingModal from '../components/DeleteFuelingModal';
import { useAuth } from '../context/AuthContext';

export default function VehicleProfile({ vehicleId, onBack, setActiveTab }) {
  const { user } = useAuth();
  const isManagerOrSupervisor = user?.role === 'gerente' || user?.role === 'encarregado' || user?.role === 'admin';
  const { refreshCart } = useFuelingCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeProfileTab, setActiveProfileTab] = useState('fuelings');

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState(null);
  const [editingFuelRecord, setEditingFuelRecord] = useState(null);
  const [deletingFuelRecord, setDeletingFuelRecord] = useState(null);
  const [notification, setNotification] = useState('');

  // Delete & Deactivate Vehicle Flow
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState(1);
  const [typedPlateConfirmation, setTypedPlateConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const vehicle = data?.vehicle;
  const stats = data?.stats || {};
  const fuelings = data?.fuelings || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
        <p className="text-white font-bold">Veículo não encontrado.</p>
        <button onClick={onBack} className="text-xs text-emerald-400 font-bold hover:underline cursor-pointer">
          Voltar para a lista de veículos
        </button>
      </div>
    );
  }

  const statusInfo = getStatusBadge(vehicle.status);
  const hasOdometer = vehicle.odometer_working === 1;

  // Deactivate Vehicle Action
  const handleDeactivate = async () => {
    setDeleting(true);
    try {
      await vehicleService.updateStatus(vehicle.id, {
        status: 'inactive',
        status_reason: 'Veículo desativado pelo usuário',
        justification: 'Desativação manual mantendo o histórico de abastecimentos.'
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

  // Hard Delete Permanently Action
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

  return (
    <div className="space-y-6">
      
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Veículos
        </button>
      </div>

      {/* Main Vehicle Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
        
        {/* Vehicle Top Identity */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center shadow-lg">
              {vehicle.photo_url ? (
                <img src={vehicle.photo_url} alt={vehicle.name} className="w-full h-full object-cover" />
              ) : (
                <Truck className="w-10 h-10 text-slate-500" />
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                  <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                  {statusInfo.label}
                </span>

                <button
                  type="button"
                  onClick={() => setStatusModalOpen(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-2 cursor-pointer"
                >
                  Alterar Situação
                </button>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                {vehicle.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="font-mono bg-white text-slate-900 px-2 py-0.5 rounded font-black border border-slate-300 shadow-sm">
                  {vehicle.plate}
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded font-medium">
                  {vehicle.brand} {vehicle.model}
                </span>
                <span className="bg-slate-800/70 px-2 py-0.5 rounded font-medium text-slate-400">
                  Tanque ~{vehicle.tank_capacity || 80}L • {vehicle.fuel_type_default}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Ações Rápidas
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setFuelModalOpen(true)}
              className="min-h-[48px] py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Fuel className="w-4 h-4 stroke-[2.5]" />
              Registrar Abastecimento
            </button>

            <button
              type="button"
              onClick={() => setStatusModalOpen(true)}
              className="min-h-[48px] py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors active:scale-[0.98] cursor-pointer"
            >
              <Clock className="w-4 h-4 text-emerald-400" />
              Alterar Status
            </button>

            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="min-h-[48px] py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors active:scale-[0.98] cursor-pointer"
            >
              <Edit className="w-4 h-4 text-blue-400" />
              Editar Veículo
            </button>
          </div>
        </div>

        {/* Aggregated KPI Cards for Vehicle */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
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
            <span className="text-[11px] text-slate-400 block font-medium">Abastecimentos</span>
            <p className="text-base sm:text-lg font-black text-white mt-0.5">
              {stats.total_fuelings || 0} ({stats.total_liters || 0} L)
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Total Combustível Gasto</span>
            <p className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
              R$ {Number(stats.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveProfileTab('fuelings')}
          className={`min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeProfileTab === 'fuelings'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Fuel className="w-4 h-4" />
          Histórico de Abastecimentos ({fuelings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveProfileTab('details')}
          className={`min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeProfileTab === 'details'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          Ficha Cadastral & Configurações
        </button>
      </div>

      {/* TAB 1: HISTÓRICO DE ABASTECIMENTOS */}
      {activeProfileTab === 'fuelings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-400" />
              Histórico de Abastecimentos ({fuelings.length})
            </h3>
            <button
              type="button"
              onClick={() => setFuelModalOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Abastecimento
            </button>
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
                      <strong className="text-white">{Number(f.liters).toFixed(2)} L</strong>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Valor</span>
                      <strong className="text-emerald-400">R$ {Number(f.total_cost).toFixed(2)}</strong>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">KM Rodados</span>
                      <strong className="text-blue-400">{f.km_driven ? `${f.km_driven} km` : '-'}</strong>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Consumo</span>
                      <strong className="text-emerald-300">{f.consumption_kml ? `${f.consumption_kml} km/L` : '-'}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>Combustível: <strong className="text-slate-200">{f.fuel_type}</strong> • Preço: R$ {Number(f.price_per_liter || 0).toFixed(2)}/L</span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {f.photo_pump_url && (
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoZoom(f.photo_pump_url)}
                          className="text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" /> Bomba
                        </button>
                      )}
                      {f.photo_dashboard_url && (
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoZoom(f.photo_dashboard_url)}
                          className="text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" /> Painel
                        </button>
                      )}
                      {isManagerOrSupervisor && (
                        <button
                          type="button"
                          onClick={() => setEditingFuelRecord(f)}
                          className="px-2 py-1 bg-slate-800 hover:bg-blue-600/30 text-blue-300 hover:text-white font-bold text-[10px] rounded-lg border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3 h-3" /> Editar
                        </button>
                      )}
                      {isManagerOrSupervisor && (
                        <button
                          type="button"
                          onClick={() => setDeletingFuelRecord(f)}
                          className="px-2 py-1 bg-slate-800 hover:bg-rose-600/30 text-rose-300 hover:text-white font-bold text-[10px] rounded-lg border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir
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

      {/* TAB 2: FICHA CADASTRAL & CONFIGURAÇÕES */}
      {activeProfileTab === 'details' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Informações Cadastrais do Veículo
            </h3>
            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-blue-400" /> Editar Dados
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Nome / Identificação</span>
              <p className="text-white font-bold text-sm">{vehicle.name}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Placa</span>
              <p className="text-emerald-400 font-mono font-bold text-sm">{vehicle.plate}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Marca & Modelo</span>
              <p className="text-white font-bold text-sm">{vehicle.brand} {vehicle.model}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Ano Fab. / Modelo</span>
              <p className="text-white font-bold text-sm">{vehicle.year_fab || '-'}/{vehicle.year_model || '-'}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Combustível Padrão</span>
              <p className="text-white font-bold text-sm">{vehicle.fuel_type_default || 'Diesel'}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Capacidade do Tanque</span>
              <p className="text-white font-bold text-sm">~{vehicle.tank_capacity || 80} Litros</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Status do Odômetro</span>
              <p className={`font-bold text-sm ${hasOdometer ? 'text-emerald-400' : 'text-amber-400'}`}>
                {hasOdometer ? '🟢 Odômetro Funcional' : '🟡 Odômetro Não Funcional'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Empresa / Secretaria</span>
              <p className="text-white font-bold text-sm">{vehicle.company || 'GCS'}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Motorista Habitual</span>
              <p className="text-white font-bold text-sm">{vehicle.driver_default || 'Não definido'}</p>
            </div>
          </div>

          {/* Danger Zone: Desativar ou Excluir */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-300 block">Gerenciamento do Veículo</span>
              <span className="text-[11px] text-slate-500">Desative para manter o histórico ou exclua se necessário.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmStep(1);
                setDeleteModalOpen(true);
              }}
              className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              Desativar ou Excluir Veículo
            </button>
          </div>
        </div>
      )}

      {/* Standalone Modals */}
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

      {/* Modal para Apagar / Desativar Veículo */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-7 w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Gerenciar Veículo: {vehicle.name}
                </h3>
                <p className="text-xs text-rose-300 font-semibold mt-1">
                  Escolha se deseja desativar (preservando histórico) ou apagar definitivamente.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Nome do Veículo:</span>
                <strong className="text-white">{vehicle.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Placa:</span>
                <strong className="text-emerald-400 font-mono">{vehicle.plate}</strong>
              </div>
            </div>

            {confirmStep === 1 ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={deleting}
                    className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition-colors flex items-start gap-3 group cursor-pointer"
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

                  <button
                    type="button"
                    onClick={() => setConfirmStep(2)}
                    className="p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 text-left transition-colors flex items-start gap-3 group cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-rose-300 group-hover:text-rose-200 block">
                        🔴 Apagar definitivamente
                      </span>
                      <span className="text-[11px] text-rose-300/70 mt-0.5 block">
                        Exclui o registro do veículo e todos os seus vínculos permanentemente.
                      </span>
                    </div>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
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
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleHardDelete}
                    disabled={deleting || typedPlateConfirmation.trim() !== vehicle.plate.trim()}
                    className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg disabled:opacity-40 cursor-pointer"
                  >
                    {deleting ? 'Apagando...' : 'Confirmar Exclusão Definitiva'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fueling Edit Modal */}
      {editingFuelRecord && vehicle && (
        <FuelingModal
          vehicle={vehicle}
          existingRecord={editingFuelRecord}
          isOpen={!!editingFuelRecord}
          onClose={() => setEditingFuelRecord(null)}
          onSuccess={(msg) => {
            alert(msg);
            loadVehicleData();
          }}
        />
      )}

      {/* Delete Fueling Modal */}
      {deletingFuelRecord && (
        <DeleteFuelingModal
          isOpen={!!deletingFuelRecord}
          record={{
            ...deletingFuelRecord,
            vehicle_name: vehicle.name,
            vehicle_plate: vehicle.plate
          }}
          onClose={() => setDeletingFuelRecord(null)}
          onSuccess={(msg) => {
            alert(msg);
            loadVehicleData();
          }}
        />
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
