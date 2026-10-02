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
  Gauge,
  TrendingUp,
  Fuel,
  Image as ImageIcon,
  Edit,
  Trash2,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { reportService, vehicleService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import FuelingModal from '../components/FuelingModal';
import DeleteFuelingModal from '../components/DeleteFuelingModal';
import {
  generateFleetReportPDF,
  generateFleetExcelReport,
  formatCurrency,
  formatLiters,
  formatKm,
  formatConsumption,
  formatDateBR
} from '../services/exportService';

export default function Reports() {
  const { user } = useAuth();
  const isManagerOrSupervisor = user?.role === 'gerente' || user?.role === 'encarregado' || user?.role === 'admin';

  const [records, setRecords] = useState([]);
  const [vehiclesData, setVehiclesData] = useState([]);
  const [summary, setSummary] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [notification, setNotification] = useState('');

  // Visualization Mode: 'together' (Todos os veículos juntos) | 'grouped' (Agrupado por veículo)
  const [viewMode, setViewMode] = useState('together');

  // Quick Period & Custom Filters
  const [activePeriod, setActivePeriod] = useState('this_week');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Edit / Delete Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);

  // Check Web Share API capability
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare;

  const getQuickPeriodDates = (periodKey) => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const formatYMD = (dt) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    };

    if (periodKey === 'this_week') {
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: formatYMD(monday),
        end: formatYMD(sunday)
      };
    } else if (periodKey === 'last_week') {
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday - 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: formatYMD(monday),
        end: formatYMD(sunday)
      };
    } else if (periodKey === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: formatYMD(firstDay),
        end: formatYMD(lastDay)
      };
    } else if (periodKey === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: formatYMD(firstDay),
        end: formatYMD(lastDay)
      };
    } else if (periodKey === 'last_30_days') {
      const d = new Date(now);
      d.setDate(now.getDate() - 30);
      return {
        start: formatYMD(d),
        end: formatYMD(now)
      };
    } else if (periodKey === 'this_year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      return {
        start: formatYMD(firstDay),
        end: formatYMD(lastDay)
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
    setLoadError(null);
    const queryParams = {
      vehicle_id: selectedVehicle || undefined,
      fuel_type: selectedFuel || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    };
    console.log('📊 [Reports Frontend] Solicitando relatórios:', {
      endpoint: '/reports/fleet',
      params: queryParams,
      period: activePeriod,
    });
    try {
      const [repRes, vehRes] = await Promise.all([
        reportService.getFleetReports(queryParams),
        vehicleService.list(),
      ]);
      const fetchedRecords = repRes.data.records || [];
      const fetchedVehiclesData = repRes.data.vehicles_data || [];
      const fetchedSummary = repRes.data.summary || {};
      const fetchedVehicles = vehRes.data.vehicles || [];

      console.log('✅ [Reports Frontend] Relatórios recebidos com sucesso:', {
        status: repRes.status,
        recordsCount: fetchedRecords.length,
        vehiclesCount: fetchedVehiclesData.length,
        summary: fetchedSummary,
      });

      setRecords(fetchedRecords);
      setVehiclesData(fetchedVehiclesData);
      setSummary(fetchedSummary);
      setVehicles(fetchedVehicles);
    } catch (err) {
      console.error('❌ [Reports Frontend] Falha na requisição de relatórios:', {
        url: err.config?.url,
        method: err.config?.method?.toUpperCase(),
        params: err.config?.params,
        status: err.response?.status,
        statusText: err.response?.statusText,
        responseData: err.response?.data,
        message: err.message,
        stack: err.stack,
      });
      const msg = err.response?.data?.error || 'Erro ao carregar dados do relatório. Verifique a conexão e tente novamente.';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Initialize with 'this_week' on mount
  useEffect(() => {
    const { start, end } = getQuickPeriodDates('this_week');
    setStartDate(start);
    setEndDate(end);
  }, []);

  useEffect(() => {
    loadReports();
  }, [selectedVehicle, selectedFuel, startDate, endDate]);

  const handleClearFilters = () => {
    setSelectedVehicle('');
    setSelectedFuel('');
    handlePeriodSelect('this_week');
  };

  // Determine report category for button & title
  const isWeeklyScope = activePeriod === 'this_week' || activePeriod === 'last_week';
  const isIndividualScope = !!selectedVehicle;
  const reportActionLabel = isIndividualScope
    ? 'Gerar Relatório Individual (PDF)'
    : isWeeklyScope
    ? 'Gerar Relatório Semanal (PDF)'
    : 'Gerar Relatório Consolidado (PDF)';

  // PDF Export Engine (Primary Action)
  const handleGeneratePDF = async (action = 'download') => {
    if (generatingPdf) return;
    if (!records || records.length === 0) {
      setPdfError('Nenhum registro encontrado para o período selecionado para gerar o arquivo PDF.');
      return;
    }
    setGeneratingPdf(true);
    setPdfError(null);
    try {
      const vehicleObj = vehicles.find((v) => String(v.id) === String(selectedVehicle));
      let periodLabel = 'Relatório';
      if (activePeriod === 'this_week') periodLabel = 'Esta Semana';
      else if (activePeriod === 'last_week') periodLabel = 'Semana Anterior';
      else if (activePeriod === 'this_month') periodLabel = 'Este Mês';
      else if (activePeriod === 'last_month') periodLabel = 'Mês Anterior';
      else if (activePeriod === 'this_year') periodLabel = 'Este Ano';

      const filtersObj = {
        is_weekly: isWeeklyScope,
        period_label: periodLabel,
        vehicle_id: selectedVehicle || undefined,
        vehicle_name: vehicleObj ? vehicleObj.name : undefined,
        fuel_type: selectedFuel || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      await generateFleetReportPDF({ filters: filtersObj, records, vehicles_data: vehiclesData, summary }, action);
      setPdfGenerated(true);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setPdfError('Erro ao gerar o relatório em PDF. Tente novamente.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Excel Export (Secondary Action)
  const handleExportExcel = () => {
    if (!records || records.length === 0) return;
    const vehicleObj = vehicles.find((v) => String(v.id) === String(selectedVehicle));
    generateFleetExcelReport({
      filters: {
        vehicle_id: selectedVehicle || undefined,
        vehicle_name: vehicleObj ? vehicleObj.name : undefined,
        fuel_type: selectedFuel || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      },
      records,
      vehicles_data: vehiclesData,
      summary
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (record) => {
    const vObj = vehicles.find((v) => String(v.id) === String(record.vehicle_id)) || {
      id: record.vehicle_id,
      name: record.vehicle_name,
      plate: record.vehicle_plate,
      brand: record.vehicle_brand,
      model: record.vehicle_model,
      odometer_working: record.odometer_working
    };
    setEditingVehicle(vObj);
    setEditingRecord(record);
  };

  // Open Delete Modal
  const handleOpenDelete = (record) => {
    setDeletingRecord(record);
  };

  // Toast Notification Auto-dismiss
  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification('');
    }, 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            RELATÓRIOS DA FROTA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Relatórios por veículo com blocos separados, histórico individual de abastecimentos e médias consolidadas.
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
                <span>{reportActionLabel}</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportExcel}
            disabled={loading || records.length === 0}
            title="Exportar dados estruturados em planilha Excel"
            className="w-full sm:w-auto min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:scale-[0.98] disabled:opacity-40 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700/60 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {notification && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-4 flex items-center gap-3 text-emerald-300 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Post-PDF Generation Actions Bar */}
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

      {loadError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadReports}
            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-700/50 rounded-xl text-white font-bold text-xs cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* 2. Visualização Selector & Quick Periods Shortcuts */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/70 p-3 rounded-2xl border border-slate-800">
        
        {/* Visualização Option (Requirement 1 & 2) */}
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-bold px-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Visualização:
          </span>
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('together')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'together'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos os veículos juntos
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Agrupado por veículo
            </button>
          </div>
        </div>

        {/* Quick Period Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold px-1">Período:</span>
          {[
            { id: 'this_week', label: 'Esta semana' },
            { id: 'last_week', label: 'Semana anterior' },
            { id: 'this_month', label: 'Este mês' },
            { id: 'last_month', label: 'Mês anterior' },
            { id: 'last_30_days', label: '30 dias' },
            { id: 'this_year', label: 'Este ano' },
            { id: 'custom', label: 'Personalizado' },
          ].map((p) => {
            const isSelected = activePeriod === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handlePeriodSelect(p.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[32px] ${
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
      </div>

      {/* 3. Filters Form Box */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-400" /> Filtros e Seleções
          </span>
          {(selectedVehicle || selectedFuel || activePeriod !== 'this_week') && (
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

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-mono">
            {startDate && endDate ? `${formatDateBR(startDate)} a ${formatDateBR(endDate)}` : 'Selecione um período'}
          </span>
          <button
            onClick={loadReports}
            className="w-full sm:w-auto min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Relatório
          </button>
        </div>
      </div>

      {/* 4. Hierarchical Vehicle-by-Vehicle Section in Dedicated Rectangles (Requirements 1, 2, 3, 4, 6, 7, 8) */}
      <div className="space-y-8">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
          </div>
        ) : vehiclesData.length > 0 ? (
          vehiclesData.map((v, vIndex) => {
            const isOdometerWorking = v.odometer_working === 1;
            const avgLitersVal = v.summary.avg_liters || (v.summary.fuelings_count > 0 ? v.summary.total_liters / v.summary.fuelings_count : 0);
            const avgPriceVal = v.summary.avg_price_per_liter || (v.summary.fuelings_count > 0 ? v.records.reduce((s, r) => s + Number(r.price_per_liter || 0), 0) / v.summary.fuelings_count : 0);
            const avgCostVal = v.summary.avg_total_cost || (v.summary.fuelings_count > 0 ? v.summary.total_cost / v.summary.fuelings_count : 0);
            const avgConsumptionVal = v.summary.avg_consumption_kml ? `${Number(v.summary.avg_consumption_kml).toFixed(2)} km/L` : 'Não disponível';

            return (
              /* DEDICATED RECTANGLE CONTAINER FOR THIS VEHICLE */
              <div
                key={v.vehicle_id || vIndex}
                className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl transition-all relative overflow-hidden"
              >
                
                {/* 4.1 Vehicle Rectangle Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center font-black text-base text-emerald-400 shrink-0">
                      🚗
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                          {v.vehicle_name}
                        </h2>
                        <span className="font-mono bg-white text-slate-900 px-2.5 py-0.5 rounded-lg font-black text-xs shadow-sm">
                          {v.vehicle_plate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {v.vehicle_brand} {v.vehicle_model} {v.vehicle_year ? `• Ano: ${v.vehicle_year}` : ''} • {isOdometerWorking ? '🟢 Odômetro funcional' : '🟡 Sem odômetro'}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3.5 py-2 rounded-xl border border-slate-700/70 self-start sm:self-auto">
                    {v.summary.fuelings_count} {v.summary.fuelings_count === 1 ? 'abastecimento' : 'abastecimentos'} no período
                  </span>
                </div>

                {/* 4.2 Individual Fuelings Table/Cards within the Rectangle (Requirement 3, 6, 7) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-emerald-400" /> Abastecimentos do Veículo
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">Ordenados por data (mais antigo ao mais recente)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {v.records.map((r, rIdx) => {
                      const hasOd = r.odometer_working === 1;

                      return (
                        <div
                          key={r.id || rIdx}
                          className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700/80 transition-all"
                        >
                          {/* Item Header */}
                          <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-black text-[10px] flex items-center justify-center">
                                {rIdx + 1}
                              </span>
                              <span className="font-bold text-white">
                                {formatDateBR(r.session_date || r.fuel_date || r.created_at)}
                              </span>
                              {r.session_code && (
                                <span className="text-[10px] font-mono text-slate-500">
                                  ({r.session_code})
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-slate-300 bg-slate-850 px-2 py-0.5 rounded-md text-[11px]">
                              {r.fuel_type || 'Diesel S10'}
                            </span>
                          </div>

                          {/* Data Columns */}
                          <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
                            {/* KM */}
                            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/50">
                              <span className="text-[10px] text-slate-500 block font-bold uppercase">KM Atual</span>
                              <span className="font-bold text-white block mt-0.5">
                                {hasOd ? (r.km_current ? formatKm(r.km_current) : '-') : <span className="text-amber-400 text-[10px]">Sem odômetro</span>}
                              </span>
                              <span className="text-[10px] text-blue-400 font-semibold block mt-0.5">
                                {hasOd && r.km_driven ? `+${formatKm(r.km_driven)}` : '-'}
                              </span>
                            </div>

                            {/* Volume & Preço/L */}
                            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/50">
                              <span className="text-[10px] text-slate-500 block font-bold uppercase">Volume</span>
                              <span className="font-black text-blue-400 block mt-0.5">{formatLiters(r.liters)}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{formatCurrency(r.price_per_liter)}/L</span>
                            </div>

                            {/* Valor Total & Consumo */}
                            <div className="bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/20">
                              <span className="text-[10px] text-emerald-400 block font-bold uppercase">Total & Média</span>
                              <strong className="text-emerald-400 font-black block mt-0.5">{formatCurrency(r.total_cost)}</strong>
                              <span className="text-[10px] font-semibold text-emerald-300 block mt-0.5">
                                {hasOd && r.consumption_kml ? `${Number(r.consumption_kml).toFixed(2)} km/L` : '—'}
                              </span>
                            </div>
                          </div>

                          {/* Actions: ✏️ Editar and 🗑️ Excluir (Requirement 6, 7) */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              {r.driver_name && <span>Motorista: <strong className="text-slate-200">{r.driver_name}</strong></span>}
                              {r.fuel_station && <span>• Posto: <strong className="text-slate-200">{r.fuel_station}</strong></span>}
                            </div>

                            <div className="flex items-center gap-1.5 ml-auto">
                              {r.photo_pump_url && (
                                <button
                                  onClick={() => setSelectedPhoto(r.photo_pump_url)}
                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-emerald-400 text-[10px] font-bold rounded-lg border border-slate-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <ImageIcon className="w-3 h-3" /> Bomba
                                </button>
                              )}
                              {r.photo_dashboard_url && (
                                <button
                                  onClick={() => setSelectedPhoto(r.photo_dashboard_url)}
                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-emerald-400 text-[10px] font-bold rounded-lg border border-slate-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <ImageIcon className="w-3 h-3" /> Painel
                                </button>
                              )}

                              {/* ✏️ EDIT ACTION BUTTON */}
                              {isManagerOrSupervisor && (
                                <button
                                  onClick={() => handleOpenEdit(r)}
                                  title="Editar abastecimento"
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600/30 text-blue-300 hover:text-white font-bold text-[11px] rounded-lg border border-slate-700 hover:border-blue-500/50 flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Editar</span>
                                </button>
                              )}

                              {/* 🗑️ DELETE ACTION BUTTON */}
                              {isManagerOrSupervisor && (
                                <button
                                  onClick={() => handleOpenDelete(r)}
                                  title="Excluir abastecimento"
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-rose-600/30 text-rose-300 hover:text-white font-bold text-[11px] rounded-lg border border-slate-700 hover:border-rose-500/50 flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Excluir</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4.3 Weekly Averages for this vehicle if multi-week */}
                {v.summary.weekly_averages && v.summary.weekly_averages.length > 1 && (
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Média de Consumo por Semana:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {v.summary.weekly_averages.map((w) => (
                        <div key={w.week_key} className="bg-slate-900 px-3 py-1.5 rounded-xl text-xs border border-slate-800 flex items-center gap-2">
                          <span className="text-slate-400">{w.week_label}:</span>
                          <strong className="text-emerald-400 font-black">
                            {w.avg_consumption_kml ? `${Number(w.avg_consumption_kml).toFixed(2)} km/L` : '—'}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4.4 RESUMO / MÉDIAS DO VEÍCULO (Bottom of Rectangle - Requirement 4) */}
                <div className="bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border-2 border-emerald-500/40 rounded-2xl p-5 space-y-3.5 shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-emerald-400" /> RESUMO / MÉDIAS DO VEÍCULO ({v.vehicle_name.toUpperCase()})
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      Calculado exclusivamente com os {v.summary.fuelings_count} abastecimentos deste veículo
                    </span>
                  </div>

                  {/* 5 Vehicle Metrics Grid (Requirement 4) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                    {/* 1. Total Abastecimentos */}
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Abastecimentos</span>
                      <strong className="text-base sm:text-lg font-black text-white block mt-0.5">
                        {v.summary.fuelings_count}
                      </strong>
                    </div>

                    {/* 2. Média de Litros */}
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Média de Litros</span>
                      <strong className="text-base sm:text-lg font-black text-blue-400 block mt-0.5">
                        {formatLiters(avgLitersVal)}
                      </strong>
                    </div>

                    {/* 3. Média Preço/L */}
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Média Preço / Litro</span>
                      <strong className="text-base sm:text-lg font-black text-slate-200 block mt-0.5">
                        {formatCurrency(avgPriceVal)}
                      </strong>
                    </div>

                    {/* 4. Média de Valor */}
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Média de Valor</span>
                      <strong className="text-base sm:text-lg font-black text-emerald-400 block mt-0.5">
                        {formatCurrency(avgCostVal)}
                      </strong>
                    </div>

                    {/* 5. Média de Consumo */}
                    <div className="bg-emerald-950/50 p-3 rounded-xl border border-emerald-500/30 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-emerald-300 uppercase block">Média de Consumo</span>
                      <strong className="text-base sm:text-lg font-black text-emerald-400 block mt-0.5">
                        {avgConsumptionVal}
                      </strong>
                    </div>
                  </div>

                  {/* Vehicle Totals Footer Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                    <div className="flex flex-wrap items-center gap-4">
                      <span>Total Gasto: <strong className="text-emerald-400 font-bold">{formatCurrency(v.summary.total_cost)}</strong></span>
                      <span>Total Litros: <strong className="text-blue-400 font-bold">{formatLiters(v.summary.total_liters)}</strong></span>
                      <span>KM Rodados: <strong className="text-white font-bold">{v.summary.total_km > 0 ? formatKm(v.summary.total_km) : '—'}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-xs text-slate-400 space-y-1.5">
            <p className="font-bold text-slate-300">Nenhum registro encontrado para o período selecionado.</p>
            <p className="text-[11px] text-slate-500">Selecione outro período ou ajuste os filtros para visualizar os dados.</p>
          </div>
        )}
      </div>

      {/* 5. RESUMO GERAL DA FROTA (Ao final do relatório - Requirements 5, 7, 8) */}
      {!loading && vehiclesData.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/60 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              Consolidação Total do Período
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              RESUMO GERAL DA FROTA
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Totais e médias gerais consolidadas de todos os {summary.total_vehicles || vehiclesData.length} veículos abastecidos no período ({startDate && endDate ? `${formatDateBR(startDate)} a ${formatDateBR(endDate)}` : 'Período Selecionado'}).
            </p>
          </div>

          {/* 4 Primary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Total de Veículos</span>
              <p className="text-2xl font-black text-white mt-1">
                {summary.total_vehicles || vehiclesData.length}
              </p>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Total de Abastecimentos</span>
              <p className="text-2xl font-black text-white mt-1">
                {summary.total_records || records.length}
              </p>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Total de Litros</span>
              <p className="text-2xl font-black text-blue-400 mt-1">
                {formatLiters(summary.total_liters)}
              </p>
            </div>

            <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-500/40">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">Total Gasto</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                {formatCurrency(summary.total_cost)}
              </p>
            </div>
          </div>

          {/* General Fleet Averages Grid (Requirement 5) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
            {/* Média Geral Litros / Abastecimento */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Média Geral Litros / Abastecimento</span>
              <p className="text-xl font-black text-blue-400 mt-1">
                {formatLiters(summary.total_records > 0 ? (summary.total_liters / summary.total_records) : 0)}
              </p>
            </div>

            {/* Média Geral Valor / Abastecimento */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Média Geral Valor / Abastecimento</span>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {formatCurrency(summary.total_records > 0 ? (summary.total_cost / summary.total_records) : 0)}
              </p>
            </div>

            {/* Média Geral Preço por Litro */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Média Geral Preço por Litro</span>
              <p className="text-xl font-black text-slate-200 mt-1">
                {formatCurrency(
                  summary.total_records > 0
                    ? records.reduce((s, r) => s + Number(r.price_per_liter || 0), 0) / summary.total_records
                    : 0
                )}
              </p>
            </div>

            {/* Média Geral de Consumo da Frota */}
            <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-500/30">
              <span className="text-xs font-bold text-emerald-300 block">Média Geral de Consumo da Frota</span>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {summary.avg_consumption_kml ? formatConsumption(summary.avg_consumption_kml) : '—'}
              </p>
            </div>
          </div>

          {/* Distance Bar */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">Quilômetros Rodados na Frota</span>
              <span className="text-xs text-slate-500">Apenas veículos com odômetro funcional</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-200">
              {summary.total_km > 0 ? formatKm(summary.total_km) : '—'}
            </p>
          </div>

          {/* Fuel distribution cards */}
          {summary.fuels && summary.fuels.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Consolidação por Combustível:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {summary.fuels.map((fuel) => (
                  <div key={fuel.name} className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-white uppercase">{fuel.name}</span>
                      <span className="text-xs text-slate-400">{fuel.count} abastec.</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-400">{formatLiters(fuel.liters)}</span>
                      <strong className="text-emerald-400 font-bold">{formatCurrency(fuel.total_cost)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fueling Edit Modal */}
      {editingRecord && editingVehicle && (
        <FuelingModal
          vehicle={editingVehicle}
          existingRecord={editingRecord}
          isOpen={!!editingRecord}
          onClose={() => {
            setEditingRecord(null);
            setEditingVehicle(null);
          }}
          onSuccess={(msg) => {
            showToast(msg);
            loadReports();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord && (
        <DeleteFuelingModal
          isOpen={!!deletingRecord}
          record={deletingRecord}
          onClose={() => setDeletingRecord(null)}
          onSuccess={(msg) => {
            showToast(msg);
            loadReports();
          }}
        />
      )}

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
