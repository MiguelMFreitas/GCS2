import React, { useState } from 'react';
import {
  ShoppingCart,
  Fuel,
  CheckCircle2,
  Trash2,
  Edit,
  ArrowRight,
  AlertCircle,
  Plus,
  Truck,
  Droplets,
  DollarSign,
  Gauge,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useFuelingCart } from '../context/FuelingCartContext';
import FuelingModal from '../components/FuelingModal';

export default function FuelingCart({ setActiveTab, onSessionFinalized }) {
  const {
    activeSession,
    cartItems,
    summary,
    loading,
    itemCount,
    totalCost,
    totalLiters,
    removeFromCart,
    finalizeCurrentSession
  } = useFuelingCart();

  const [editingRecord, setEditingRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState(null);

  const handleEditItem = (record) => {
    // Construct vehicle object for the modal
    const vehicleObj = {
      id: record.vehicle_id,
      name: record.vehicle_name,
      plate: record.vehicle_plate,
      brand: record.vehicle_brand,
      model: record.vehicle_model,
      year_fab: record.year_fab,
      year_model: record.year_model,
      fuel_type_default: record.fuel_type_default,
      odometer_working: record.odometer_working
    };
    setEditingRecord({ vehicle: vehicleObj, record });
    setModalOpen(true);
  };

  const handleRemoveItem = async (recordId, vehicleName) => {
    if (window.confirm(`Deseja realmente remover ${vehicleName} do carrinho de abastecimento?`)) {
      try {
        await removeFromCart(recordId, 'Remoção manual pelo usuário');
      } catch (err) {
        alert('Erro ao remover item do carrinho.');
      }
    }
  };

  const handleFinalize = async () => {
    if (cartItems.length === 0) {
      alert('O carrinho está vazio.');
      return;
    }

    setFinalizing(true);
    try {
      const result = await finalizeCurrentSession();
      // Trigger festive confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      if (onSessionFinalized) {
        onSessionFinalized(result.session.id);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao finalizar abastecimento.');
      setFinalizing(false);
    }
  };

  const fuels = summary?.fuels || [];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Sessão: {activeSession?.code || 'Sessão da Semana'}</span>
              <span>•</span>
              <span>{activeSession?.date ? activeSession.date.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Carrinho de Abastecimento
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Revise todos os veículos abastecidos nesta sessão antes de gerar o relatório consolidado.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('weekly-fueling')}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar Mais Veículos
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Summary Bar (Requirements 17 & 32) */}
      <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Resumo do Abastecimento em Tempo Real
          </span>
          <span className="text-xs text-slate-400">
            Calculado automaticamente pelo sistema
          </span>
        </div>

        {/* Big KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-xs font-semibold text-slate-400 block">Veículos Adicionados</span>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">
              🛒 {itemCount} {itemCount === 1 ? 'veículo' : 'veículos'}
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-xs font-semibold text-slate-400 block">Volume Total de Combustível</span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {Number(totalLiters).toFixed(2)} <span className="text-sm font-bold text-slate-400">Litros</span>
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/10">
            <span className="text-xs font-semibold text-emerald-300 block">Valor Parcial da Sessão</span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              R$ {Number(totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Real-time Fuel Breakdown Pills (Item 27, 28, 29) */}
        {fuels.length > 0 && (
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-400">Consolidação Parcial:</span>
            {fuels.map((fuel) => (
              <div
                key={fuel.name}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200"
              >
                <span className="font-bold text-white">{fuel.name}:</span>
                <span className="text-emerald-400 font-bold">{fuel.liters} L</span>
                <span className="text-slate-400">•</span>
                <span className="font-bold text-white">R$ {Number(fuel.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Items List (Requirement 16) */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center justify-between">
          <span>Veículos Adicionados ao Abastecimento ({itemCount})</span>
        </h2>

        {cartItems.length > 0 ? (
          <div className="space-y-3">
            {cartItems.map((item, index) => {
              const hasOdometer = item.odometer_working === 1;
              return (
                <div
                  key={item.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Vehicle Details */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 font-black text-sm border border-slate-700">
                      #{index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-base text-white truncate">
                          {item.vehicle_name}
                        </h3>
                        <span className="text-xs font-mono font-bold bg-white text-slate-900 px-2 py-0.5 rounded border border-slate-300">
                          {item.vehicle_plate}
                        </span>
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">
                          {item.fuel_type}
                        </span>
                        <span className="text-xs bg-slate-800/60 text-slate-400 px-2 py-0.5 rounded font-medium">
                          {item.is_full_tank ? 'Tanque Cheio' : 'Parcial'}
                        </span>
                      </div>

                      {/* Numbers Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs text-slate-300">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Quilometragem</span>
                          <span className="font-bold text-white">
                            {hasOdometer ? (item.km_current ? `${Number(item.km_current).toLocaleString('pt-BR')} km` : '-') : 'Não funcional'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">Litros & Preço/L</span>
                          <span className="font-bold text-white">
                            {item.liters} L • R$ {Number(item.price_per_liter).toFixed(2)}/L
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">Total Pago</span>
                          <span className="font-black text-emerald-400">
                            R$ {Number(item.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">Média Consumo</span>
                          <span className="font-bold text-emerald-300">
                            {hasOdometer && item.consumption_kml
                              ? `${item.consumption_kml} km/L`
                              : <span className="text-slate-400 italic">Não calculado</span>}
                          </span>
                        </div>
                      </div>

                      {/* Attached Photos thumbnails */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                        <span className="font-semibold">Fotos:</span>
                        {item.photo_pump_url && (
                          <button
                            onClick={() => setSelectedPhotoZoom(item.photo_pump_url)}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                          >
                            <ImageIcon className="w-3 h-3" /> Bomba
                          </button>
                        )}
                        {item.photo_dashboard_url && (
                          <button
                            onClick={() => setSelectedPhotoZoom(item.photo_dashboard_url)}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                          >
                            <ImageIcon className="w-3 h-3" /> Painel
                          </button>
                        )}
                        {item.driver_name && (
                          <span className="text-slate-400 ml-2">Motorista: {item.driver_name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Edit & Remove Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Editar registro"
                    >
                      <Edit className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id, item.vehicle_name)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Remover do carrinho"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
            <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-white">Seu carrinho de abastecimento está vazio</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Adicione os veículos que foram abastecidos hoje para consolidar os totais da semana.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('weekly-fueling')}
              className="py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg"
            >
              <Fuel className="w-4 h-4" /> Ir para Abastecimento da Semana
            </button>
          </div>
        )}
      </div>

      {/* Finalize Section & Button (Requirement 24) */}
      {cartItems.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <h3 className="font-bold text-base text-white">Pronto para finalizar o abastecimento?</h3>
            <p className="text-xs text-slate-400">
              O sistema irá fechar a sessão, consolidar as médias e gerar automaticamente o relatório completo.
            </p>
          </div>

          <button
            onClick={() => setConfirmFinalizeOpen(true)}
            className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 transition-all"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            FINALIZAR ABASTECIMENTO
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmFinalizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Revisão e Finalização</h3>
                <p className="text-xs text-slate-400">Sessão: {activeSession?.code}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total de Veículos:</span>
                <strong className="text-white">{itemCount}</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Volume Total:</span>
                <strong className="text-white">{Number(totalLiters).toFixed(2)} Litros</strong>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-2">
                <span className="font-bold text-white">VALOR TOTAL DO ABASTECIMENTO:</span>
                <strong className="text-emerald-400 text-sm">
                  R$ {Number(totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmFinalizeOpen(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Voltar e Editar
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                disabled={finalizing}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
              >
                {finalizing ? 'Finalizando...' : 'Confirmar Finalização'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <FuelingModal
          vehicle={editingRecord.vehicle}
          existingRecord={editingRecord.record}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingRecord(null);
          }}
          onNextVehicle={() => {
            setModalOpen(false);
            setEditingRecord(null);
          }}
          onViewCart={() => {
            setModalOpen(false);
            setEditingRecord(null);
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
