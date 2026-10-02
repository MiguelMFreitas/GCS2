import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  Search,
  Fuel,
  DollarSign,
  Droplets,
  Truck,
  Download,
  Gauge,
  Eye,
  X,
  Sparkles,
  Zap,
  Image as ImageIcon,
  Edit,
  Trash2
} from 'lucide-react';
import { reportService, sessionService, vehicleService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import FuelingModal from '../components/FuelingModal';
import DeleteFuelingModal from '../components/DeleteFuelingModal';
import { generateSessionPDF, formatDateBR, formatCurrency, formatLiters, formatKm, formatConsumption } from '../services/exportService';

export default function History({ onSelectSession }) {
  const { user } = useAuth();
  const isManagerOrSupervisor = user?.role === 'gerente' || user?.role === 'encarregado' || user?.role === 'admin';

  const [records, setRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('individual'); // 'individual' | 'sessions'
  const [onlyLatest, setOnlyLatest] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState(null);
  const [generatingPdfId, setGeneratingPdfId] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [notification, setNotification] = useState('');

  const loadHistoryData = async () => {
    setLoading(true);
    try {
      const [repRes, sessRes, vehRes] = await Promise.all([
        reportService.getFleetReports({}),
        sessionService.listAll(),
        vehicleService.list()
      ]);
      const recs = repRes.data.records || [];
      // Sort newest first
      recs.sort((a, b) => {
        const dateA = a.session_date || a.created_at || '';
        const dateB = b.session_date || b.created_at || '';
        return dateB.localeCompare(dateA) || (b.id || 0) - (a.id || 0);
      });
      setRecords(recs);
      setSessions(sessRes.data.sessions || []);
      setVehicles(vehRes.data.vehicles || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, []);

  const handleDirectPdfDownload = async (e, sessionId) => {
    e.stopPropagation();
    setGeneratingPdfId(sessionId);
    try {
      const res = await sessionService.getById(sessionId);
      const { session, records: sRecords, summary } = res.data;
      generateSessionPDF(session, sRecords, summary);
    } catch (err) {
      alert('Erro ao gerar PDF da sessão.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  // Filter individual records
  let displayedRecords = records.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.vehicle_name?.toLowerCase().includes(term) ||
      r.vehicle_plate?.toLowerCase().includes(term) ||
      r.fuel_type?.toLowerCase().includes(term) ||
      r.session_code?.toLowerCase().includes(term) ||
      (r.session_date && r.session_date.includes(term)) ||
      (r.created_at && r.created_at.includes(term)) ||
      String(r.id).includes(term)
    );
  });

  if (onlyLatest && displayedRecords.length > 0) {
    displayedRecords = [displayedRecords[0]];
  }

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return s.code?.toLowerCase().includes(term) || s.date?.includes(term) || s.notes?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
              <HistoryIcon className="w-3.5 h-3.5" /> Histórico de Abastecimentos
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Histórico Operacional
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Consulte todos os abastecimentos registrados individualmente com fotos, km, litros e médias.
            </p>
          </div>

          {/* Quick Option: Último Abastecimento */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                setOnlyLatest(!onlyLatest);
                setViewMode('individual');
              }}
              className={`py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                onlyLatest
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/40'
                  : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${onlyLatest ? 'text-white' : 'text-emerald-400'}`} />
              {onlyLatest ? 'Exibindo: Último Abastecimento' : 'Ver Último Abastecimento'}
            </button>
          </div>
        </div>

        {/* View Mode Switch Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => {
              setViewMode('individual');
              setOnlyLatest(false);
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'individual' && !onlyLatest
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            📋 Todos os Abastecimentos Individuais ({records.length})
          </button>
          <button
            onClick={() => {
              setViewMode('sessions');
              setOnlyLatest(false);
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'sessions'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            📅 Sessões Semanais ({sessions.length})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="🔍 Buscar por veículo, placa, data, combustível ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        </div>

        {onlyLatest && (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
            ⚡ Filtrado: Apenas o registro mais recente
          </span>
        )}
      </div>

      {/* VIEW MODE 1: INDIVIDUAL FUELINGS */}
      {viewMode === 'individual' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
            </div>
          ) : displayedRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedRecords.map((r) => {
                const isOdometerWorking = r.odometer_working === 1 || r.odometer_working === true || r.odometer_working === '1';
                const hasValidKml = isOdometerWorking && r.consumption_kml && Number(r.consumption_kml) > 0;
                const formattedDate = formatDateBR(r.session_date || r.created_at);

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 cursor-pointer transition-all shadow-lg hover:shadow-xl hover:shadow-slate-950/50 flex flex-col justify-between space-y-4"
                  >
                    {/* Header Row: ID, Data, Sessão */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">
                          #{r.id}
                        </span>
                        <span className="font-bold text-xs text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" /> {formattedDate}
                        </span>
                      </div>

                      {r.session_code && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                          {r.session_code}
                        </span>
                      )}
                    </div>

                    {/* Vehicle Identity */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors truncate">
                          {r.vehicle_name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {r.fuel_type || 'Diesel'}
                        </p>
                      </div>

                      <span className="font-mono bg-white text-slate-900 px-2 py-0.5 rounded font-black text-xs border border-slate-300 shadow-sm shrink-0">
                        {r.vehicle_plate}
                      </span>
                    </div>

                    {/* 4 Metric Cards */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                      <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Litros</span>
                        <strong className="text-white block mt-0.5">{formatLiters(r.liters)}</strong>
                      </div>

                      <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Valor</span>
                        <strong className="text-emerald-400 block mt-0.5">{formatCurrency(r.total_cost)}</strong>
                      </div>

                      <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">KM</span>
                        <strong className="text-blue-400 block mt-0.5">
                          {isOdometerWorking && r.km_current ? `${Number(r.km_current).toLocaleString('pt-BR')}` : '—'}
                        </strong>
                      </div>

                      <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Média</span>
                        <strong className={`block mt-0.5 ${hasValidKml ? 'text-emerald-300 font-bold' : 'text-slate-500 italic'}`}>
                          {hasValidKml ? formatConsumption(r.consumption_kml) : '—'}
                        </strong>
                      </div>
                    </div>

                    {/* Footer Row: Photos & Click hint */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        {r.photo_pump_url && (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            📷 Bomba
                          </span>
                        )}
                        {r.photo_dashboard_url && (
                          <span className="text-blue-400 flex items-center gap-1 font-semibold text-[10px] bg-blue-500/10 px-2 py-0.5 rounded-md">
                            📷 Painel
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-0.5">
                        Ver detalhes <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
              <HistoryIcon className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Nenhum abastecimento encontrado</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Cadastre ou finalize abastecimentos para visualizar o histórico completo aqui.
              </p>
            </div>
          )}
        </>
      )}

      {/* VIEW MODE 2: SESSIONS GRID */}
      {viewMode === 'sessions' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
            </div>
          ) : filteredSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.map((session) => {
                const formattedDate = session.date ? session.date.split('-').reverse().join('/') : '';
                const isCompleted = session.status === 'completed';

                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession && onSelectSession(session.id)}
                    className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 cursor-pointer transition-all shadow-lg hover:shadow-xl hover:shadow-slate-950/50 flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <span className="font-black text-sm text-white">{formattedDate}</span>
                      </div>

                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isCompleted
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}>
                        {isCompleted ? '✅ Finalizado' : '⏳ Em andamento'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-mono font-bold text-slate-400 block">
                        {session.code}
                      </span>
                      {session.notes && (
                        <p className="text-xs text-slate-300 line-clamp-2">{session.notes}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">Veículos & Litros</span>
                        <strong className="text-white block mt-0.5">
                          🚚 {session.total_vehicles || 0} veíc. • {Number(session.total_liters || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L
                        </strong>
                      </div>

                      <div className="bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-300 block font-semibold">Valor Total Pago</span>
                        <strong className="text-emerald-400 text-sm block mt-0.5 font-black">
                          R$ {Number(session.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={(e) => handleDirectPdfDownload(e, session.id)}
                        disabled={generatingPdfId === session.id}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700/60 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-400" />
                        {generatingPdfId === session.id ? 'Gerando...' : '📄 Ver PDF'}
                      </button>

                      <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1">
                        Abrir Sessão <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
              <HistoryIcon className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Nenhuma sessão encontrada</h3>
            </div>
          )}
        </>
      )}

      {/* DETAIL MODAL: Detalhes Completos do Abastecimento Selecionado */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  #{selectedRecord.id}
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    {selectedRecord.vehicle_name}
                    <span className="font-mono bg-white text-slate-900 px-2 py-0.5 rounded font-black text-xs border border-slate-300">
                      {selectedRecord.vehicle_plate}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Data: {formatDateBR(selectedRecord.session_date || selectedRecord.created_at)}
                    {selectedRecord.session_code && ` • Sessão: ${selectedRecord.session_code}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* 3 Detail Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Col 1: Quilometragem */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    QUILOMETRAGEM
                  </span>
                  {selectedRecord.odometer_working === 1 ? (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Anterior:</span>
                        <strong className="text-white">{formatKm(selectedRecord.km_previous)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Atual:</span>
                        <strong className="text-white">{formatKm(selectedRecord.km_current)}</strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-800">
                        <span className="text-blue-300 font-bold">Rodados:</span>
                        <strong className="text-blue-400">{formatKm(selectedRecord.km_driven)}</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-amber-400 italic">Odômetro não funcional.</p>
                  )}
                </div>

                {/* Col 2: Abastecimento */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    ABASTECIMENTO
                  </span>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Combustível:</span>
                      <strong className="text-white">{selectedRecord.fuel_type || 'Diesel'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Litros:</span>
                      <strong className="text-white">{formatLiters(selectedRecord.liters)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Preço / Litro:</span>
                      <strong className="text-white">{formatCurrency(selectedRecord.price_per_liter)}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-emerald-300 font-bold">Total:</span>
                      <strong className="text-emerald-400 text-sm font-black">{formatCurrency(selectedRecord.total_cost)}</strong>
                    </div>
                  </div>
                </div>

                {/* Col 3: Desempenho */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    DESEMPENHO
                  </span>
                  {selectedRecord.odometer_working === 1 && selectedRecord.consumption_kml ? (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Consumo:</span>
                        <strong className="text-emerald-400 text-sm font-black">{formatConsumption(selectedRecord.consumption_kml)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Custo / KM:</span>
                        <strong className="text-blue-400">
                          {selectedRecord.cost_per_km ? `R$ ${Number(selectedRecord.cost_per_km).toFixed(2)}/km` : '—'}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">
                      {selectedRecord.odometer_working !== 1 ? 'Odômetro não funcional.' : 'Consumo não calculado (sem km anterior).'}
                    </p>
                  )}
                </div>
              </div>

              {/* Extra Info (Driver, Station, Notes) */}
              {(selectedRecord.driver_name || selectedRecord.fuel_station || selectedRecord.notes) && (
                <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-1">
                  {selectedRecord.driver_name && (
                    <p className="text-slate-300"><strong>Motorista:</strong> {selectedRecord.driver_name}</p>
                  )}
                  {selectedRecord.fuel_station && (
                    <p className="text-slate-300"><strong>Posto:</strong> {selectedRecord.fuel_station}</p>
                  )}
                  {selectedRecord.notes && (
                    <p className="text-slate-400 italic"><strong>Obs:</strong> {selectedRecord.notes}</p>
                  )}
                </div>
              )}

              {/* Photos Section */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  📷 Comprovantes & Fotos do Abastecimento
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Foto da Bomba */}
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <span className="text-slate-400 font-bold block text-[11px]">Foto da Bomba de Combustível</span>
                    {selectedRecord.photo_pump_url ? (
                      <div
                        onClick={() => setSelectedPhotoZoom(selectedRecord.photo_pump_url)}
                        className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-700 group cursor-pointer"
                      >
                        <img src={selectedRecord.photo_pump_url} alt="Bomba" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold gap-1 transition-opacity">
                          <Eye className="w-4 h-4" /> Ampliar Foto
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 italic">
                        Nenhuma foto da bomba anexada.
                      </div>
                    )}
                  </div>

                  {/* Foto do Painel */}
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <span className="text-slate-400 font-bold block text-[11px]">Foto do Painel (Odômetro)</span>
                    {selectedRecord.photo_dashboard_url ? (
                      <div
                        onClick={() => setSelectedPhotoZoom(selectedRecord.photo_dashboard_url)}
                        className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-700 group cursor-pointer"
                      >
                        <img src={selectedRecord.photo_dashboard_url} alt="Painel" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold gap-1 transition-opacity">
                          <Eye className="w-4 h-4" /> Ampliar Foto
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 italic">
                        Nenhuma foto do painel anexada.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isManagerOrSupervisor && (
                  <button
                    type="button"
                    onClick={() => {
                      const rec = selectedRecord;
                      const vObj = vehicles.find((v) => String(v.id) === String(rec.vehicle_id)) || {
                        id: rec.vehicle_id,
                        name: rec.vehicle_name,
                        plate: rec.vehicle_plate,
                        brand: rec.vehicle_brand,
                        model: rec.vehicle_model,
                        odometer_working: rec.odometer_working
                      };
                      setEditingVehicle(vObj);
                      setEditingRecord(rec);
                      setSelectedRecord(null);
                    }}
                    className="py-2 px-3.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-xs border border-blue-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </button>
                )}
                {isManagerOrSupervisor && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingRecord(selectedRecord);
                      setSelectedRecord(null);
                    }}
                    className="py-2 px-3.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs border border-rose-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer ml-auto"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
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
            setNotification(msg);
            setTimeout(() => setNotification(''), 4000);
            loadHistoryData();
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
            setNotification(msg);
            setTimeout(() => setNotification(''), 4000);
            loadHistoryData();
          }}
        />
      )}

      {/* Photo Zoom Modal */}
      {selectedPhotoZoom && (
        <div
          onClick={() => setSelectedPhotoZoom(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 p-2">
            <button
              onClick={() => setSelectedPhotoZoom(null)}
              className="absolute top-4 right-4 p-2 bg-slate-950/80 text-white rounded-full hover:bg-slate-800 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedPhotoZoom} alt="Visualização Ampliada" className="w-full max-h-[85vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
