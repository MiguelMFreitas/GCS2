import React, { useState } from 'react';
import { Trash2, AlertCircle, X } from 'lucide-react';
import { fuelingService } from '../services/api';
import { formatCurrency, formatLiters, formatDateBR } from '../services/exportService';

export default function DeleteFuelingModal({
  isOpen,
  record,
  onClose,
  onSuccess
}) {
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !record) return null;

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setErrorMsg('');
    try {
      await fuelingService.delete(record.id);
      if (onSuccess) {
        onSuccess(`✓ Abastecimento de ${record.vehicle_name || 'Veículo'} (${record.vehicle_plate || '-'}) excluído com sucesso!`);
      }
      onClose();
    } catch (err) {
      console.error('Erro ao excluir abastecimento:', err);
      setErrorMsg(err.response?.data?.error || 'Erro ao excluir o abastecimento. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Trash2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Warning */}
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">
            Deseja realmente excluir este abastecimento?
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Esta ação excluirá permanentemente o registro no banco de dados e recalculará as médias e totais da frota automaticamente.
          </p>
        </div>

        {/* Confirmation Details Card */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <span className="text-slate-400 font-semibold">Veículo:</span>
            <div className="text-right">
              <span className="font-bold text-white block">{record.vehicle_name || 'Veículo'}</span>
              <span className="text-[11px] font-mono font-bold bg-white text-slate-900 px-1.5 py-0.2 rounded">
                {record.vehicle_plate || '-'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <span className="text-slate-400 font-semibold">Data:</span>
            <span className="font-bold text-white">
              {formatDateBR(record.session_date || record.fuel_date || record.created_at)}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <span className="text-slate-400 font-semibold">Combustível:</span>
            <span className="font-bold text-slate-200">{record.fuel_type || 'Diesel S10'}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <span className="text-slate-400 font-semibold">Volume / Litros:</span>
            <span className="font-bold text-blue-400">{formatLiters(record.liters)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold">Valor Total:</span>
            <strong className="font-black text-emerald-400 text-sm">{formatCurrency(record.total_cost)}</strong>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs border border-slate-700/60 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-rose-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {deleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Excluir abastecimento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
