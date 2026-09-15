import React, { useState, useEffect } from 'react';
import {
  Truck,
  Fuel,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
  DollarSign,
  Droplets,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ShieldAlert,
  BarChart3
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { reportService } from '../services/api';

export default function Dashboard({ setActiveTab, onOpenFuelingModal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => console.error('Erro ao carregar dados do dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const totals = data?.totals || {};
  const insights = data?.insights || {};
  const fuelDistribution = data?.fuel_distribution || [];
  const recentSessions = data?.recent_sessions || [];
  const alerts = data?.alerts || [];

  const FUEL_COLORS = {
    Diesel: '#16a34a',
    Gasolina: '#0284c7',
    Etanol: '#d97706',
    GNV: '#9333ea',
    Outro: '#64748b',
  };

  return (
    <div className="space-y-6">
      
      {/* Top Welcome & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5" /> Painel de Controle Operacional
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            Gestão Semanal da Frota
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Acompanhamento de abastecimentos de segunda-feira, médias de consumo e manutenção.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('weekly-fueling')}
            className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all"
          >
            <Fuel className="w-4 h-4 stroke-[2.5]" />
            Abastecimento da Semana
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Requirement 3) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Frota */}
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

        {/* Status da Semana: Abastecidos vs Pendentes */}
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

        {/* Total Gasto na Semana */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Gasto (Semana)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-white truncate">
              R$ {Number(totals.total_spent_week || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Volume: <strong className="text-slate-200">{Number(totals.total_liters_week || 0).toFixed(1)} L</strong>
            </p>
          </div>
        </div>

        {/* Média de Consumo da Frota */}
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
                Sem dados
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              Excluindo veículos sem odômetro
            </p>
          </div>
        </div>
      </div>

      {/* Highlights & Fleet Insights Grid (Requirement 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Veículo Mais Econômico */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Veículo Mais Econômico</span>
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
                    {insights.most_economical.kml} km/L
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm font-bold text-slate-500 mt-1">Sem dados</p>
            )}
          </div>
        </div>

        {/* Maior Gasto na Frota */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Maior Gasto Acumulado</span>
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

        {/* Veículo Que Mais Rodou */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Mais Rodou no Período</span>
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
        
        {/* Fuel Type Distribution Chart */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-400" /> Distribuição por Combustível
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
                    formatter={(val) => [`${val} Litros`, 'Volume']}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">Sem dados de combustível no momento.</p>
            )}
          </div>
        </div>

        {/* Alerts & System Notifications (Requirement 43) */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Alertas Operacionais e Vencimentos
            </h3>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
              {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
            </span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl text-xs flex items-start gap-3 border ${
                    alert.type === 'danger'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${alert.type === 'danger' ? 'text-rose-400' : 'text-amber-400'}`} />
                  <div className="flex-1">
                    <span className="font-bold text-[11px] uppercase tracking-wider block mb-0.5">
                      [{alert.category}]
                    </span>
                    <p className="leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                Nenhuma pendência ou vencimento crítico identificado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
