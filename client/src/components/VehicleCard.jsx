import React from 'react';
import { Truck, Fuel, CheckCircle2, Clock, AlertTriangle, XCircle, Gauge, Calendar, ShieldCheck, ChevronRight } from 'lucide-react';

export function getStatusBadge(status) {
  switch (status) {
    case 'working':
      return {
        label: 'Funcionando / Rodando',
        badge: '🟢 Funcionando',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        dot: 'bg-emerald-500'
      };
    case 'stopped':
      return {
        label: 'Parado',
        badge: '🔴 Parado',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        dot: 'bg-rose-500'
      };
    case 'maintenance':
      return {
        label: 'Em manutenção',
        badge: '🟡 Em manutenção',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        dot: 'bg-amber-500'
      };
    case 'inactive':
    default:
      return {
        label: 'Inativo',
        badge: '⚫ Inativo',
        color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
        dot: 'bg-slate-500'
      };
  }
}

export default function VehicleCard({
  vehicle,
  onClick,
  onFuelClick,
  isWeeklyMode = false,
  isFueledInCurrentSession = false,
  fuelRecord = null
}) {
  const statusInfo = getStatusBadge(vehicle.status);
  const isWorking = vehicle.status === 'working';
  const hasOdometer = vehicle.odometer_working === 1;

  return (
    <div
      onClick={onClick}
      className={`group relative bg-slate-900/90 hover:bg-slate-850 border rounded-2xl p-4 md:p-5 transition-all cursor-pointer shadow-md hover:shadow-xl hover:shadow-slate-950/50 flex flex-col justify-between ${
        isFueledInCurrentSession
          ? 'border-emerald-500/50 ring-1 ring-emerald-500/20 bg-emerald-950/10'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top row: Status & Weekly Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}>
          <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`} />
          {statusInfo.label}
        </span>

        {isWeeklyMode && isWorking && (
          isFueledInCurrentSession ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-slate-950 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" /> Adicionado ao abastecimento
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" /> Pendente
            </span>
          )
        )}
      </div>

      {/* Center: Vehicle Info Card */}
      <div className="flex items-start gap-3.5 my-1">
        {/* Photo or Icon */}
        <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center">
          {vehicle.photo_url ? (
            <img src={vehicle.photo_url} alt={vehicle.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <Truck className="w-8 h-8 text-slate-500" />
          )}
        </div>

        {/* Text info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors truncate">
            {vehicle.name}
          </h3>
          <p className="text-xs text-slate-400 truncate">{vehicle.brand} {vehicle.model} {vehicle.version || ''}</p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Mercosul Placa */}
            <div className="inline-flex items-center bg-white text-slate-900 px-2 py-0.5 rounded border border-slate-300 font-mono text-xs font-black tracking-wider shadow-sm">
              <span className="text-[9px] bg-blue-700 text-white px-1 mr-1 rounded-xs">BRA</span>
              {vehicle.plate}
            </div>

            {/* Ano Fab/Mod */}
            <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded">
              {vehicle.year_fab}/{vehicle.year_model}
            </span>

            {/* Combustível */}
            <span className="text-xs font-medium text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded flex items-center gap-1">
              <Fuel className="w-3 h-3 text-emerald-400" />
              {vehicle.fuel_type_default || 'Diesel'}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Details: Odometer state & Last info */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Gauge className={`w-3.5 h-3.5 ${hasOdometer ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>
            {hasOdometer ? (
              vehicle.last_km ? `${Number(vehicle.last_km).toLocaleString('pt-BR')} km` : 'Odômetro funcional'
            ) : (
              <span className="text-slate-400 italic">Sem odômetro funcional</span>
            )}
          </span>
        </div>

        {/* Fueling specific preview if already added in current session */}
        {fuelRecord && (
          <div className="font-bold text-emerald-400">
            {fuelRecord.liters} L • R$ {Number(fuelRecord.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        )}
      </div>

      {/* Actions row if in weekly mode */}
      {isWeeklyMode && isWorking && (
        <div className="mt-3 pt-2">
          {isFueledInCurrentSession ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFuelClick(vehicle);
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
            >
              ✏️ Editar Abastecimento
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFuelClick(vehicle);
              }}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
            >
              <Fuel className="w-4 h-4 stroke-[2.5]" /> Abastecer Veículo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
