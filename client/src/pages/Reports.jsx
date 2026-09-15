import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Calendar,
  Filter,
  Download,
  Eye,
  Share2,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Truck,
  Droplets,
  DollarSign,
  Gauge
} from 'lucide-react';
import { reportService, vehicleService } from '../services/api';
import {
  generateFleetReportPDF,
  formatCurrency,
  formatLiters,
  formatKm,
  formatConsumption,
  formatDateBR
} from '../services/exportService';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  // Quick Period & Custom Filters
  const [activePeriod, setActivePeriod] = useState('this_month');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Check Web Share API capability
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare;

  const getQuickPeriodDates = (periodKey) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (periodKey === 'this_week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      return {
        start: monday.toISOString().split('T')[0],
        end: todayStr
      };
    } else if (periodKey === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: firstDay.toISOString().split('T')[0],
        end: todayStr
      };
    } else if (periodKey === 'last_30_days') {
      const d = new Date(now);
      d.setDate(now.getDate() - 30);
      return {
        start: d.toISOString().split('T')[0],
        end: todayStr
      };
    } else if (periodKey === 'this_year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      return {
        start: firstDay.toISOString().split('T')[0],
        end: todayStr
      };
    }
    return { start: '', end: '' };
  };

  const handlePeriodSelect = (periodKey) => {
    setActivePeriod(periodKey);
    if (periodKey !== 'custom') {
      const { start, end } = getQuickPeriodDates(periodKey);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    setPdfError(null);
    try {
      const [repRes, vehRes] = await Promise.all([
        reportService.getFleetReports({
          vehicle_id: selectedVehicle || undefined,
          fuel_type: selectedFuel || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        vehicleService.list(),
      ]);
      setRecords(repRes.data.records || []);
      setSummary(repRes.data.summary || {});
      setVehicles(vehRes.data.vehicles || []);
    } catch (err) {
      console.error('Erro ao gerar relatórios:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize with 'this_month' on mount
  useEffect(() => {
    const { start, end } = getQuickPeriodDates('this_month');
    setStartDate(start);
    setEndDate(end);
  }, []);

  useEffect(() => {
    loadReports();
  }, [selectedVehicle, selectedFuel, startDate, endDate]);

  const handleClearFilters = () => {
    setSelectedVehicle('');
    setSelectedFuel('');
    handlePeriodSelect('this_month');
  };

  // PDF Export Engine (Primary Action)
  const handleGeneratePDF = async (action = 'download') => {
    if (generatingPdf) return;
    setGeneratingPdf(true);
    setPdfError(null);
    try {
      const vehicleObj = vehicles.find((v) => String(v.id) === String(selectedVehicle));
      const filtersObj = {
        vehicle_name: vehicleObj ? vehicleObj.name : undefined,
        fuel_type: selectedFuel || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      await generateFleetReportPDF({ filters: filtersObj, records, summary }, action);
      setPdfGenerated(true);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setPdfError('Erro ao gerar o relatório em PDF. Tente novamente.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Excel Export (Secondary Action)
  const exportExcel = () => {
    const rows = records.map((r, i) => ({
      Item: i + 1,
      Data: formatDateBR(r.session_date || r.created_at),
      Sessão: r.session_code || '-',
      Veículo: r.vehicle_name,
      Placa: r.vehicle_plate,
      Combustível: r.fuel_type,
      Odômetro: r.odometer_working === 1 ? 'Funcional' : 'Não funcional',
      'KM Anterior': r.km_previous || '-',
      'KM Atual': r.km_current || '-',
      'KM Rodados': r.km_driven || '-',
      Litros: Number(r.liters || 0),
      'Valor / Litro (R$)': Number(r.price_per_liter || 0),
      'Valor Total (R$)': Number(r.total_cost || 0),
      'Média (km/L)': r.odometer_working === 1 && r.consumption_kml ? Number(r.consumption_kml) : 'Não calculado',
      'Custo/KM (R$/km)': r.odometer_working === 1 && r.cost_per_km ? Number(r.cost_per_km) : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Frota');
    XLSX.writeFile(wb, `Gerenciamento_Frota_Relatorio_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      
      {/* 1. Header (Requirements 5, 6, 7) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            RELATÓRIOS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Consumo, abastecimentos e custos da frota
          </p>
        </div>

        {/* Primary Action Button (PDF) & Secondary Excel */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleGeneratePDF('download')}
            disabled={generatingPdf || loading || records.length === 0}
            className="w-full sm:w-auto min-h-[44px] py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            {generatingPdf ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-emerald-100" />
                <span>Gerar PDF</span>
              </>
            )}
          </button>

          <button
            onClick={exportExcel}
            disabled={loading || records.length === 0}
            title="Exportar dados em planilha Excel (Opção Secundária)"
            className="w-full sm:w-auto min-h-[44px] py-2.5 px-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:scale-[0.98] disabled:opacity-40 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700/60 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Post-PDF Generation Actions Bar (Requirements 7, 30, 31) */}
      {pdfGenerated && (
        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Relatório em PDF gerado com sucesso!</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleGeneratePDF('view')}
              className="flex-1 sm:flex-none min-h-[38px] px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" /> Visualizar PDF
            </button>
            <button
              onClick={() => handleGeneratePDF('download')}
              className="flex-1 sm:flex-none min-h-[38px] px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Baixar PDF
            </button>
            {canShare && (
              <button
                onClick={() => handleGeneratePDF('share')}
                className="flex-1 sm:flex-none min-h-[38px] px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" /> Compartilhar
              </button>
            )}
          </div>
        </div>
      )}

      {pdfError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{pdfError}</span>
        </div>
      )}

      {/* 2. Quick Periods Shortcuts (Requirement 22) */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold px-2">Período:</span>
        {[
          { id: 'this_week', label: 'Esta semana' },
          { id: 'this_month', label: 'Este mês' },
          { id: 'last_30_days', label: 'Últimos 30 dias' },
          { id: 'this_year', label: 'Este ano' },
          { id: 'custom', label: 'Personalizado' },
        ].map((p) => {
          const isSelected = activePeriod === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handlePeriodSelect(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* 3. Filters Form Box (Requirement 21) */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-400" /> Filtros
          </span>
          {(selectedVehicle || selectedFuel || activePeriod !== 'this_month') && (
            <button
              onClick={handleClearFilters}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Veículo</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Todos os Veículos</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Combustível</label>
            <select
              value={selectedFuel}
              onChange={(e) => setSelectedFuel(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Todos os Combustíveis</option>
              <option value="Diesel S10">Diesel S10</option>
              <option value="Diesel Comum">Diesel Comum</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Etanol">Etanol</option>
              <option value="GNV">GNV</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePeriod('custom');
              }}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePeriod('custom');
              }}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            onClick={loadReports}
            className="w-full sm:w-auto min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Aplicar filtros
          </button>
        </div>
      </div>

      {/* 4. Resumo Executivo: 2x2 Grid on Mobile (Requirement 23) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">Abastecimentos</span>
          <p className="text-xl sm:text-2xl font-black text-white mt-1">
            {summary.total_records || records.length || 0}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">Total de Litros</span>
          <p className="text-xl sm:text-2xl font-black text-blue-400 mt-1">
            {formatLiters(summary.total_liters)}
          </p>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 bg-emerald-950/10 p-4 rounded-2xl">
          <span className="text-[11px] text-emerald-300 block font-bold uppercase tracking-wider">Gasto Total</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(summary.total_cost)}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">Média da Frota</span>
          <p className="text-xl sm:text-2xl font-black text-slate-200 mt-1">
            {formatConsumption(summary.avg_consumption_kml)}
          </p>
        </div>
      </div>

      {/* 5. Detailed Records List (Requirements 24 & 29) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Registros Filtrados ({records.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
          </div>
        ) : records.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {records.map((r, index) => {
              const hasOdometer = r.odometer_working === 1;
              return (
                <div key={r.id || index} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-white block truncate">{r.vehicle_name}</span>
                      <span className="text-[11px] text-slate-400">
                        {formatDateBR(r.session_date || r.created_at)} • {r.session_code || 'Sessão'}
                      </span>
                    </div>
                    <span className="font-mono bg-white text-slate-900 px-2 py-0.5 rounded font-black text-xs shrink-0">
                      {r.vehicle_plate}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-0.5 text-slate-300">
                    <div className="bg-slate-950/50 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">Combustível</span>
                      <span className="font-semibold text-white truncate block">{r.fuel_type}</span>
                      <span className="text-[10px] text-slate-400">{formatLiters(r.liters)}</span>
                    </div>

                    <div className="bg-slate-950/50 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">Desempenho</span>
                      <span className="font-semibold text-emerald-400 block">
                        {hasOdometer && r.consumption_kml
                          ? `${Number(r.consumption_kml).toFixed(2)} km/L`
                          : <span className="text-slate-500 italic text-[10px]">Sem média</span>}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {hasOdometer && r.km_driven ? `${formatKm(r.km_driven)}` : '-'}
                      </span>
                    </div>

                    <div className="bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-400 block font-semibold">Valor Total</span>
                      <strong className="text-emerald-400 font-black text-sm block">
                        {formatCurrency(r.total_cost)}
                      </strong>
                      <span className="text-[10px] text-emerald-300/80">
                        R$ {Number(r.price_per_liter || 0).toFixed(2)}/L
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-xs text-slate-500">
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  );
}
