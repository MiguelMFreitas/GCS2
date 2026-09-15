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
  Download
} from 'lucide-react';
import { sessionService } from '../services/api';
import { generateSessionPDF } from '../services/exportService';

export default function History({ onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatingPdfId, setGeneratingPdfId] = useState(null);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await sessionService.listAll();
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error('Erro ao carregar sessões de abastecimento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDirectPdfDownload = async (e, sessionId) => {
    e.stopPropagation();
    setGeneratingPdfId(sessionId);
    try {
      const res = await sessionService.getById(sessionId);
      const { session, records, summary } = res.data;
      generateSessionPDF(session, records, summary);
    } catch (err) {
      alert('Erro ao gerar PDF da sessão.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return s.code?.toLowerCase().includes(term) || s.date?.includes(term) || s.notes?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
          <HistoryIcon className="w-3.5 h-3.5" /> Histórico Operacional
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Sessões de Abastecimento Anteriores
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Consulte os abastecimentos anteriores, abra os relatórios completos ou baixe o PDF executivo de cada data.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="🔍 Buscar por código da sessão ou data (AAAA-MM-DD)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
      </div>

      {/* Sessions Grid (Requirement 17 & 38) */}
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
                onClick={() => onSelectSession(session.id)}
                className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 cursor-pointer transition-all shadow-lg hover:shadow-xl hover:shadow-slate-950/50 flex flex-col justify-between space-y-4"
              >
                {/* Header Row */}
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

                {/* Session Info */}
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-slate-400 block">
                    {session.code}
                  </span>
                  {session.notes && (
                    <p className="text-xs text-slate-300 line-clamp-2">{session.notes}</p>
                  )}
                </div>

                {/* Summary Metrics (Item 17: Data, X veículos, X litros, R$ total) */}
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

                {/* Actions Row: Ver PDF & Abrir Relatório (Item 17) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={(e) => handleDirectPdfDownload(e, session.id)}
                    disabled={generatingPdfId === session.id}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700/60"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    {generatingPdfId === session.id ? 'Gerando...' : '📄 Ver PDF'}
                  </button>

                  <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1">
                    Abrir Detalhes <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
          <HistoryIcon className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum histórico encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Os abastecimentos finalizados aparecerão aqui organizados por semana.
          </p>
        </div>
      )}
    </div>
  );
}
