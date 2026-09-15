import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Fuel,
  Truck,
  Droplets,
  DollarSign,
  Gauge,
  TrendingUp,
  ArrowLeft,
  Calendar,
  Share2,
  Image as ImageIcon
} from 'lucide-react';
import { sessionService } from '../services/api';
import { generateSessionPDF, generateSessionExcel } from '../services/exportService';

export default function SessionReport({ sessionId, onBack, setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    sessionService.getById(sessionId)
      .then((res) => setData(res.data))
      .catch((err) => console.error('Erro ao carregar relatório da sessão:', err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const session = data?.session;
  const records = data?.records || [];
  const summary = data?.summary || {};

  if (!session) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <p className="text-white font-bold">Relatório não encontrado.</p>
        <button onClick={onBack} className="text-xs text-emerald-400 font-bold hover:underline">
          Voltar para o histórico
        </button>
      </div>
    );
  }

  const formattedDate = session.date ? session.date.split('-').reverse().join('/') : '';
  const fuels = summary?.fuels || [];

  return (
    <div className="space-y-6">
      
      {/* Top Navigation & Export Actions (Requirement 35) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-md">
        <button
          onClick={onBack || (() => setActiveTab('history'))}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Histórico
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => generateSessionPDF(session, records, summary)}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            📄 Gerar PDF
          </button>

          <button
            onClick={() => generateSessionExcel(session, records, summary)}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            📊 Exportar Excel
          </button>

          <button
            onClick={() => window.print()}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-colors"
          >
            <Printer className="w-4 h-4" />
            🖨 Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Main Fast-Read Executive Summary (Requirement 34) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/50 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Banner Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-slate-950 shadow-sm mb-2">
              <CheckCircle2 className="w-4 h-4 stroke-[3]" /> ABASTECIMENTO FINALIZADO
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Relatório Geral da Sessão: <span className="text-emerald-400">{session.code}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Data: <strong>{formattedDate}</strong>
              <span>•</span>
              Finalizado em: <strong>{session.finalized_at || 'Hoje'}</strong>
            </p>
          </div>

          {/* TOTAL PAGO BIG HIGHLIGHT (Requirement 31 & 34) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-right sm:min-w-64">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">
              TOTAL PAGO NO ABASTECIMENTO
            </span>
            <p className="text-2xl sm:text-4xl font-black text-emerald-400 mt-1 tracking-tight">
              R$ {Number(summary.total_cost || session.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Total consolidado de todos os veículos
            </span>
          </div>
        </div>

        {/* Resumo Geral (Requirement 25) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 block">Veículos Abastecidos</span>
            <p className="text-2xl font-black text-white mt-1">
              🚚 {summary.total_vehicles || records.length}
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 block">Total de Litros</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {Number(summary.total_liters || session.total_liters || 0).toFixed(2)} <span className="text-xs text-slate-400 font-normal">L</span>
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 block">Quilômetros Rodados</span>
            <p className="text-2xl font-black text-blue-400 mt-1">
              {summary.total_km_driven ? `${Number(summary.total_km_driven).toLocaleString('pt-BR')} km` : '—'}
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 block">Média da Frota</span>
            <p className="text-2xl font-black text-blue-400 mt-1">
              {summary.fleet_avg_consumption_kml ? `${summary.fleet_avg_consumption_kml} km/L` : '—'}
            </p>
          </div>
        </div>

        {/* Resumo por Combustível: Gasolina, Diesel, Etanol (Requirements 27, 28, 29, 30, 31) */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Consolidação por Combustível
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fuels.map((fuel) => {
              const isDiesel = fuel.name.toUpperCase().includes('DIESEL');
              const isGasolina = fuel.name.toUpperCase().includes('GASOLINA');
              return (
                <div
                  key={fuel.name}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isDiesel
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : isGasolina
                      ? 'bg-blue-950/20 border-blue-500/30'
                      : 'bg-amber-950/20 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      {isDiesel ? '🚚' : isGasolina ? '⛽' : '🌿'} {fuel.name.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      {fuel.count} {fuel.count === 1 ? 'veículo' : 'veículos'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total de Litros:</span>
                      <strong className="text-white">{Number(fuel.liters).toFixed(2)} L</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Preço Médio / Litro:</span>
                      <strong className="text-white">R$ {Number(fuel.avg_price_per_liter).toFixed(2)}/L</strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/80 pt-2 text-sm">
                      <span className="font-bold text-slate-200">Total Gasto:</span>
                      <strong className="font-black text-emerald-400">
                        R$ {Number(fuel.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Relatório Detalhado por Veículo (Requirement 26) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            Detalhamento Individual dos Veículos Abastecidos ({records.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map((r, index) => {
            const hasOdometer = r.odometer_working === 1;
            return (
              <div
                key={r.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-colors"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-emerald-400 border border-slate-700">
                      #{index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">
                        {r.vehicle_name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {r.vehicle_brand} {r.vehicle_model}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block bg-white text-slate-900 font-mono text-xs font-black px-2 py-0.5 rounded border border-slate-300">
                      {r.vehicle_plate}
                    </span>
                    <span className="text-[11px] block text-slate-400 font-medium mt-1">
                      {r.fuel_type} • {r.is_full_tank ? 'Tanque Cheio' : 'Parcial'}
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  
                  {/* KM Anterior & Atual */}
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Quilometragem</span>
                    <span className="font-bold text-white block">
                      {hasOdometer
                        ? (r.km_current ? `${Number(r.km_current).toLocaleString('pt-BR')} km` : '-')
                        : <span className="text-slate-500 italic">Não funcional</span>}
                    </span>
                    {hasOdometer && r.km_previous && (
                      <span className="text-[9px] text-slate-500">
                        Ant: {Number(r.km_previous).toLocaleString('pt-BR')} km
                      </span>
                    )}
                  </div>

                  {/* KM Rodados */}
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">KM Rodados</span>
                    <span className="font-bold text-blue-400 block">
                      {hasOdometer && r.km_driven
                        ? `${Number(r.km_driven).toLocaleString('pt-BR')} km`
                        : '—'}
                    </span>
                  </div>

                  {/* Média de Consumo km/L */}
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Consumo Médio</span>
                    <span className="font-black text-emerald-400 block">
                      {hasOdometer && r.consumption_kml
                        ? `${Number(r.consumption_kml).toFixed(2)} km/L`
                        : <span className="text-slate-400 italic text-[11px]">Não calculado</span>}
                    </span>
                  </div>

                  {/* Volume de Litros */}
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Litros</span>
                    <span className="font-bold text-white block">
                      {Number(r.liters).toFixed(2)} L
                    </span>
                    <span className="text-[9px] text-slate-500">
                      R$ {Number(r.price_per_liter).toFixed(2)}/L
                    </span>
                  </div>

                  {/* Custo por KM */}
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Custo por KM</span>
                    <span className="font-bold text-slate-200 block">
                      {hasOdometer && r.cost_per_km
                        ? `R$ ${Number(r.cost_per_km).toFixed(2)}/km`
                        : '—'}
                    </span>
                  </div>

                  {/* Valor Total Pago */}
                  <div className="bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-300 block font-semibold">Valor Pago</span>
                    <span className="font-black text-emerald-400 text-sm block">
                      R$ {Number(r.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Footer details: Driver, Station & Attached Photos */}
                <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <div>
                    {r.driver_name && <span>Motorista: <strong className="text-slate-200">{r.driver_name}</strong></span>}
                    {r.fuel_station && <span className="ml-2">• Posto: {r.fuel_station}</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    {r.photo_pump_url && (
                      <button
                        onClick={() => setSelectedPhoto(r.photo_pump_url)}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Foto Bomba
                      </button>
                    )}
                    {r.photo_dashboard_url && (
                      <button
                        onClick={() => setSelectedPhoto(r.photo_dashboard_url)}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Foto Painel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo Zoom Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 cursor-pointer"
        >
          <div className="max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
            <img src={selectedPhoto} alt="Comprovante / Foto" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
