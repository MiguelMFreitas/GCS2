import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Gauge,
  Calendar
} from 'lucide-react';
import { vehicleService } from '../services/api';
import VehicleCard from '../components/VehicleCard';
import VehicleFormModal from '../components/VehicleFormModal';

export default function Vehicles({ onSelectVehicle }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehicleService.list({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchTerm || undefined,
      });
      setVehicles(res.data.vehicles || []);
    } catch (err) {
      console.error('Erro ao listar veículos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [filterStatus, searchTerm]);

  const handleOpenCreate = () => {
    setEditingVehicle(null);
    setModalOpen(true);
  };

  const filterButtons = [
    { id: 'all', label: 'Todos os Veículos' },
    { id: 'working', label: '🟢 Funcionando / Rodando' },
    { id: 'stopped', label: '🔴 Parados' },
    { id: 'maintenance', label: '🟡 Em Manutenção' },
    { id: 'inactive', label: '⚫ Inativos' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
            <Truck className="w-3.5 h-3.5" /> Gestão da Frota
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Veículos Cadastrados
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ficha individual, controle de odômetro, documentos e manutenção por veículo.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Cadastrar Veículo
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Search Input (Requirement 4) */}
        <div className="relative w-full lg:w-96">
          <input
            type="text"
            placeholder="🔍 Buscar por nome, modelo ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        </div>

        {/* Status Filters Pill Group (Requirement 5) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterStatus(btn.id)}
              className={`py-2 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                filterStatus === btn.id
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Grid (Requirement 4: Rectangular Cards) */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
        </div>
      ) : vehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              isWeeklyMode={false}
              onClick={() => onSelectVehicle(vehicle.id)}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
          <Truck className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Nenhum veículo cadastrado.</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cadastre os veículos da sua empresa para iniciar a gestão e controle de abastecimento.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> + Cadastrar primeiro veículo
          </button>
        </div>
      )}

      {/* Vehicle Form Modal */}
      <VehicleFormModal
        isOpen={modalOpen}
        vehicleToEdit={editingVehicle}
        onClose={() => {
          setModalOpen(false);
          setEditingVehicle(null);
        }}
        onSaved={loadVehicles}
      />
    </div>
  );
}
