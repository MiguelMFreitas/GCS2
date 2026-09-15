import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Clock, Ban, Wrench, Calendar, Building, Save } from 'lucide-react';
import { vehicleService } from '../services/api';

export default function StatusChangeModal({ vehicle, isOpen, onClose, onUpdated }) {
  const [status, setStatus] = useState(vehicle?.status || 'working');
  const [statusDate, setStatusDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusReason, setStatusReason] = useState(vehicle?.status_reason || '');
  const [statusWorkshop, setStatusWorkshop] = useState(vehicle?.status_workshop || '');
  const [statusReturnForecast, setStatusReturnForecast] = useState(vehicle?.status_return_forecast || '');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !vehicle) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (status === 'stopped' && !statusReason) {
      setErrorMsg('Informe o motivo pelo qual o veículo está parado.');
      return;
    }

    if (status === 'maintenance' && !statusReason) {
      setErrorMsg('Informe o motivo da manutenção e a oficina.');
      return;
    }

    setSubmitting(true);
    try {
      await vehicleService.updateStatus(vehicle.id, {
        status,
        status_date: statusDate,
        status_reason: statusReason,
        status_workshop: statusWorkshop,
        status_return_forecast: statusReturnForecast,
        justification
      });
      onUpdated();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Erro ao alterar situação do veículo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Alterar Situação: <span className="text-emerald-400">{vehicle.name}</span>
            </h2>
            <p className="text-xs text-slate-400">Placa: {vehicle.plate}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Status Selection Buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Nova Situação do Veículo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('working')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  status === 'working'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                🟢 Funcionando / Rodando
              </button>

              <button
                type="button"
                onClick={() => setStatus('stopped')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  status === 'stopped'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                    : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                🔴 Parado
              </button>

              <button
                type="button"
                onClick={() => setStatus('maintenance')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  status === 'maintenance'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                    : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                🟡 Em manutenção
              </button>

              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  status === 'inactive'
                    ? 'bg-slate-700/60 border-slate-600 text-slate-200 ring-1 ring-slate-500'
                    : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                ⚫ Inativo
              </button>
            </div>
          </div>

          {/* Conditional Fields based on status (Item 7) */}
          {status === 'stopped' && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3">
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                Detalhes do Veículo Parado
              </h4>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Data em que parou</label>
                <input
                  type="date"
                  value={statusDate}
                  onChange={(e) => setStatusDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Motivo <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  placeholder="Ex: Aguardando motorista, aguardando documentação..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  required
                />
              </div>
            </div>
          )}

          {status === 'maintenance' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Detalhes da Manutenção
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Data de entrada</label>
                  <input
                    type="date"
                    value={statusDate}
                    onChange={(e) => setStatusDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Previsão de retorno</label>
                  <input
                    type="date"
                    value={statusReturnForecast}
                    onChange={(e) => setStatusReturnForecast(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Oficina / Mecânica</label>
                <input
                  type="text"
                  placeholder="Nome da oficina mecânica"
                  value={statusWorkshop}
                  onChange={(e) => setStatusWorkshop(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Motivo / Problema <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  placeholder="Ex: Troca de embreagem, revisão periódica..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  required
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Salvando...' : 'Confirmar Situação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
