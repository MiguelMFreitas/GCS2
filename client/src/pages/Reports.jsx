import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Calendar,
  Filter,
  Download,
  Printer,
  Fuel,
  TrendingUp,
  DollarSign,
  Droplets,
  Truck
} from 'lucide-react';
import { reportService, vehicleService } from '../services/api';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReports = async () => {
    setLoading(true);
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

  useEffect(() => {
    loadReports();
  }, [selectedVehicle, selectedFuel, startDate, endDate]);

  const exportExcel = () => {
    const rows = records.map((r) => ({
      Data: r.session_date || r.created_at?.split('T')[0] || '',
      Sessão: r.session_code || '-',
      Veículo: r.vehicle_name,
      Placa: r.vehicle_plate,
      Combustível: r.fuel_type,
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
    XLSX.writeFile(wb, `Relatorio_Frota_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
            <FileBarChart className="w-3.5 h-3.5" /> Inteligência Operacional
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Relatórios Customizados da Frota
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Filtre por período, veículo e combustível para análises executivas de consumo e custos.
          </p>
        </div>

        <button
          onClick={exportExcel}
          className="py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar Planilha Excel
        </button>
      </div>

      {/* Filter Box */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-slate-300 mb-1 font-semibold">Filtrar por Veículo</label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
          >
            <option value="">Todos os Veículos</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-300 mb-1 font-semibold">Tipo de Combustível</label>
          <select
            value={selectedFuel}
            onChange={(e) => setSelectedFuel(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
          >
            <option value="">Todos os Combustíveis</option>
            <option value="Diesel">Diesel</option>
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
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
          />
        </div>

        <div>
          <label className="block text-slate-300 mb-1 font-semibold">Data Final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
          />
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">Abastecimentos</span>
          <p className="text-xl font-black text-white mt-1">{summary.total_records || 0}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">Volume Total</span>
          <p className="text-xl font-black text-emerald-400 mt-1">{summary.total_liters || 0} L</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">Gasto Total</span>
          <p className="text-xl font-black text-emerald-400 mt-1">
            R$ {Number(summary.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">Média Frota</span>
          <p className="text-xl font-black text-blue-400 mt-1">
            {summary.avg_consumption_kml ? `${summary.avg_consumption_kml} km/L` : '—'}
          </p>
        </div>
      </div>

      {/* Records Table / Cards */}
      <div className="space-y-3">
        {records.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {records.map((r) => (
              <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{r.vehicle_name}</span>
                  <span className="font-mono bg-white text-slate-900 px-2 py-0.5 rounded font-black text-xs">
                    {r.vehicle_plate}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs pt-1 text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Data</span>
                    <span>{r.session_date || r.created_at?.split('T')[0]}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Litros</span>
                    <span>{r.liters} L ({r.fuel_type})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Valor</span>
                    <strong className="text-emerald-400">R$ {Number(r.total_cost).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-xs text-slate-500">
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  );
}
