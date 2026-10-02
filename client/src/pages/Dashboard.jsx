import React, { useState, useEffect } from 'react';
import {
  Truck,
  Fuel,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Inbox
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { reportService } from '../services/api';

function getMondayAndSunday(dateObj = new Date()) {
  const d = new Date(dateObj);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatYMD = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  const formatBR = (dt) => {
    const dayStr = String(dt.getDate()).padStart(2, '0');
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const y = dt.getFullYear();
    return `${dayStr}/${m}/${y}`;
  };

  return {
    mondayDate: monday,
    sundayDate: sunday,
    startDate: formatYMD(monday),
    endDate: formatYMD(sunday),
    displayRange: `${formatBR(monday)} — ${formatBR(sunday)}`
  };
}

export default function Dashboard({ setActiveTab, onOpenFuelingModal }) {
  const [currentBaseDate, setCurrentBaseDate] = useState(new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const weekInfo = getMondayAndSunday(currentBaseDate);
  const todayWeekInfo = getMondayAndSunday(new Date());
  const isCurrentWeek = weekInfo.startDate === todayWeekInfo.startDate;

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await reportService.getDashboard({
        start_date: weekInfo.startDate,
        end_date: weekInfo.endDate,
      });
      setData(res.data);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [weekInfo.startDate, weekInfo.endDate]);

  const handlePrevWeek = () => {
    const prev = new Date(currentBaseDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentBaseDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentBaseDate);
    next.setDate(next.getDate() + 7);
    setCurrentBaseDate(next);
  };

  const handleCurrentWeek = () => {
    setCurrentBaseDate(new Date());
  };

  const totals = data?.totals || {};
  const insights = data?.insights || {};
  const fuelDistribution = data?.fuel_distribution || [];
  const alerts = data?.alerts || [];
  const hasRecordsThisWeek = (totals.fueled_this_week || 0) > 0 || (totals.total_liters_week || 0) > 0;

  const FUEL_COLORS = {
    Diesel: '#16a34a',
    Gasolina: '#0284c7',
    Etanol: '#d97706',
    GNV: '#9333ea',
    Outro: '#64748b',
  };

  return (
    <div className="space-y-6">
      
      {/* 1. SELETOR DE SEMANA (Requirement 1) */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                {isCurrentWeek ? 'Semana Atual' : 'Semana Selecionada'}
              </span>
              {isCurrentWeek && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                  Em Curso
                </span>
              )}
            </div>
            <p className="text-lg sm:text-xl font-black text-white mt-0.5 font-mono">
              {weekInfo.displayRange}
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handlePrevWeek}
            className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Semana anterior
          </button>

          {!isCurrentWeek && (
            <button
              onClick={handleCurrentWeek}
              className="py-2 px-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-colors cursor-pointer"
            >
              Semana atual
            </button>
          )}

          <button
            onClick={handleNextWeek}
            className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
          >
            Próxima semana <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Welcome & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5" /> Painel de Controle Operacional
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            Gestão Semanal da Frota
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Controle dos abastecimentos da semana selecionada ({weekInfo.displayRange}).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('weekly-fueling')}
            className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
          >
            <Fuel className="w-4 h-4 stroke-[2.5]" />
            Abastecimento da Semana
          </button>
        </div>
      </div>

      {/* Empty Week Notice (Requirement 4) */}
      {!loading && !hasRecordsThisWeek && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 text-slate-400 text-xs">
          <Inbox className="w-5 h-5 text-slate-500 shrink-0" />
          <span>Nenhum abastecimento registrado nesta semana. Os dados e indicadores abaixo representam a semana selecionada.</span>
        </div>
      )}

      {/* Primary KPI Grid (Requirement 2 & 4: Strictly for Selected Week) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Frota (Overview) */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total de Veículos</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-white">{totals.total_vehicles || 0}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-bold">🟢 {totals.working_vehicles || 0} rodando</span>
              <span>•</span>
              <span className="text-amber-400">🟡 {totals.maintenance_vehicles || 0} manut.</span>
            </div>
          </div>
        </div>

        {/* Abastecimento da Semana Selecionada */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Abastecimento Semana</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-emerald-400">{totals.fueled_this_week || 0}</p>
              <span className="text-xs font-medium text-slate-400">de {totals.working_vehicles || 0} ativos</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              <span className="text-amber-300 font-semibold">⏳ {totals.pending_this_week || 0} pendentes</span>
            </div>
          </div>
        </div>

        {/* Total Gasto na Semana Selecionada */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Gasto (Semana)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-white truncate">
              R$ {Number(totals.total_spent_week || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Volume: <strong className="text-slate-200">{Number(totals.total_liters_week || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L</strong>
            </p>
          </div>
        </div>

        {/* Média de Consumo da Frota na Semana */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Média Consumo Frota</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {totals.fleet_avg_consumption_kml ? (
              <p className="text-2xl sm:text-3xl font-black text-blue-400">
                {totals.fleet_avg_consumption_kml} <span className="text-sm font-semibold text-slate-400">km/L</span>
              </p>
            ) : (
              <p className="text-xl sm:text-2xl font-black text-slate-500">
                —
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              Veículos com odômetro na semana
            </p>
          </div>
        </div>
      </div>

      {/* Highlights & Fleet Insights Grid (Requirement 2 & 3: Renamed to "Maior Gasto na Semana") */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Veículo Mais Econômico */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Veículo Mais Econômico na Semana</span>
            {insights.most_economical ? (
              <>
                <h4 className="font-bold text-sm text-white truncate">
                  {insights.most_economical.name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono bg-white text-slate-900 px-1.5 py-0.2 rounded font-bold">
                    {insights.most_economical.plate}
                  </span>
                  <span className="text-xs font-black text-emerald-400">
                    {Number(insights.most_economical.kml).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} km/L
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm font-bold text-slate-500 mt-1">Sem dados</p>
            )}
          </div>
        </div>

        {/* Maior Gasto na Semana (Requirement 3: Renamed from Acumulado) */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Maior Gasto na Semana</span>
            {insights.highest_spender ? (
              <>
                <h4 className="font-bold text-sm text-white truncate">
                  {insights.highest_spender.name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono bg-white text-slate-900 px-1.5 py-0.2 rounded font-bold">
                    {insights.highest_spender.plate}
                  </span>
                  <span className="text-xs font-black text-amber-400">
                    R$ {Number(insights.highest_spender.total_spent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm font-bold text-slate-500 mt-1">Sem dados</p>
            )}
          </div>
        </div>

        {/* Veículo Que Mais Rodou na Semana */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Mais Rodou na Semana</span>
            {insights.most_km ? (
              <>
                <h4 className="font-bold text-sm text-white truncate">
                  {insights.most_km.name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono bg-white text-slate-900 px-1.5 py-0.2 rounded font-bold">
                    {insights.most_km.plate}
                  </span>
                  <span className="text-xs font-black text-blue-400">
                    {Number(insights.most_km.total_km).toLocaleString('pt-BR')} km
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm font-bold text-slate-500 mt-1">Sem dados</p>
            )}
          </div>
        </div>
      </div>

      {/* Visual Charts & Session Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Fuel Type Distribution Chart (Strictly in selected week) */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-400" /> Distribuição por Combustível na Semana
            </h3>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {fuelDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fuelDistribution}
                    dataKey="total_liters"
                    nameKey="fuel_group"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {fuelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={FUEL_COLORS[entry.fuel_group] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val) => [`${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L`, 'Volume']}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500 text-center">Nenhum abastecimento registrado nesta semana.</p>
            )}
          </div>
        </div>

        {/* Recent Fueling Sessions & Operational Summary */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Sessões Recentes de Abastecimento
            </h3>
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer"
            >
              Ver histórico completo →
            </button>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto">
            {data?.recent_sessions && data.recent_sessions.length > 0 ? (
              data.recent_sessions.map((sess) => (
                <div
                  key={sess.id}
                  onClick={() => setActiveTab('history')}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      ⛽
                    </div>
                    <div>
                      <p className="font-bold text-white">
                        {sess.date ? sess.date.split('-').reverse().join('/') : 'Data não informada'}
                        <span className="text-[10px] text-slate-400 font-mono ml-2 font-normal">({sess.code})</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {sess.total_vehicles || 0} veículos • {Number(sess.total_liters || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-400 block text-xs sm:text-sm">
                      R$ {Number(sess.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {sess.status === 'completed' ? 'Finalizado' : 'Em andamento'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                Nenhum abastecimento recente cadastrado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
