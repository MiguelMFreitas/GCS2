import React, { useState, useEffect } from 'react';
import {
  Fuel,
  ShoppingCart,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  Calendar,
  AlertCircle,
  Plus
} from 'lucide-react';
import { vehicleService } from '../services/api';
import { useFuelingCart } from '../context/FuelingCartContext';
import VehicleCard from '../components/VehicleCard';
import FuelingModal from '../components/FuelingModal';

export default function WeeklyFueling({ setActiveTab, onOpenVehicleModal }) {
  const { activeSession, cartItems, itemCount, totalCost, totalLiters, startSession } = useFuelingCart();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Load all working vehicles
  const loadWorkingVehicles = async () => {
    setLoading(true);
    try {
      // Fetch only 'working' vehicles as requested in Requirements 13, 48, 49
      const res = await vehicleService.list({ status: 'working' });
      setVehicles(res.data.vehicles || []);
    } catch (err) {
      console.error('Erro ao carregar veículos ativos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkingVehicles();
  }, []);

  // Set of vehicle IDs in the current cart session
  const fueledVehicleMap = new Map();
  cartItems.forEach((r) => {
    fueledVehicleMap.set(r.vehicle_id, r);
  });

  const totalWorkingCount = vehicles.length;
  const addedCount = vehicles.filter((v) => fueledVehicleMap.has(v.id)).length;
  const progressPercent = totalWorkingCount > 0 ? Math.round((addedCount / totalWorkingCount) * 100) : 0;

  // Search filtering
  const filteredVehicles = vehicles.filter((v) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.name?.toLowerCase().includes(term) ||
      v.model?.toLowerCase().includes(term) ||
      v.brand?.toLowerCase().includes(term) ||
      v.plate?.toLowerCase().includes(term)
    );
  });

  const handleOpenFuelModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setModalOpen(true);
  };

  // Find next pending vehicle to fuel
  const handleFuelNextVehicle = () => {
    const nextPending = vehicles.find((v) => !fueledVehicleMap.has(v.id));
    if (nextPending) {
      setSelectedVehicle(nextPending);
      setModalOpen(true);
    } else {
      setActiveTab('cart');
    }
  };

  const currentDateFormatted = activeSession?.date
    ? activeSession.date.split('-').reverse().join('/')
    : new Date().toLocaleDateString('pt-BR');

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Abastecimento da Semana Header & Progress (Requirement 13) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/50 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Sessão: {activeSession?.code || 'Nova Sessão'}</span>
              <span>•</span>
              <span>Período: {currentDateFormatted}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Abastecimento da Semana
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Adicione os veículos abastecidos ao carrinho antes de finalizar a operação.
            </p>
          </div>

          {/* Cart summary pill button */}
          <button
            onClick={() => setActiveTab('cart')}
            className="flex items-center justify-between sm:justify-start gap-3 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 p-3 px-4 rounded-2xl transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block font-medium">Carrinho da Semana</span>
              <span className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                {itemCount} {itemCount === 1 ? 'veículo' : 'veículos'} • R$ {Number(totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </button>
        </div>

        {/* Progress Tracker (Requirement 13: "8 de 12 veículos adicionados") */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-bold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Progresso do Abastecimento: <strong className="text-emerald-400">{addedCount} de {totalWorkingCount} veículos adicionados</strong>
            </span>
            <span className="font-black text-emerald-400">{progressPercent}%</span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 shadow-sm shadow-emerald-500/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="🔍 Buscar por nome, modelo ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400">
            Exibindo apenas veículos 🟢 <strong className="text-slate-200">Funcionando</strong>
          </span>
        </div>
      </div>

      {/* Vehicles Grid (Only working vehicles - Requirement 13) */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
        </div>
      ) : filteredVehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => {
            const isAdded = fueledVehicleMap.has(vehicle.id);
            const record = fueledVehicleMap.get(vehicle.id);
            return (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isWeeklyMode={true}
                isFueledInCurrentSession={isAdded}
                fuelRecord={record}
                onClick={() => handleOpenFuelModal(vehicle)}
                onFuelClick={() => handleOpenFuelModal(vehicle)}
              />
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
          <Fuel className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Nenhum veículo disponível para abastecimento.</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cadastre veículos ativos na frota para iniciar os abastecimentos semanais.
            </p>
          </div>
          {onOpenVehicleModal && (
            <button
              onClick={onOpenVehicleModal}
              className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> + Cadastrar primeiro veículo
            </button>
          )}
        </div>
      )}

      {/* Fueling Modal */}
      <FuelingModal
        vehicle={selectedVehicle}
        existingRecord={selectedVehicle ? fueledVehicleMap.get(selectedVehicle.id) : null}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedVehicle(null);
        }}
        onNextVehicle={handleFuelNextVehicle}
        onViewCart={() => setActiveTab('cart')}
      />
    </div>
  );
}
