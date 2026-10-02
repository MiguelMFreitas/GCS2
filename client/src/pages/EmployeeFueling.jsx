import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fuelingService, uploadService } from '../services/api';
import {
  Fuel,
  LogOut,
  Camera,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowLeft,
  RefreshCw,
  Check,
  X,
  Gauge,
  Droplets,
  DollarSign
} from 'lucide-react';

export default function EmployeeFueling() {
  const { user, logout } = useAuth();

  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Form State (Raw numbers typed by user)
  const [rawKm, setRawKm] = useState(null);

  const [userTotalCost, setUserTotalCost] = useState(null);
  const [userPricePerLiter, setUserPricePerLiter] = useState(null);
  const [userLiters, setUserLiters] = useState(null);
  const [activeFields, setActiveFields] = useState([]); // tracks up to 2 user-filled fields

  // Photos
  const [photoDashboard, setPhotoDashboard] = useState(null);
  const [photoPump, setPhotoPump] = useState(null);
  const [uploadingDashboard, setUploadingDashboard] = useState(false);
  const [uploadingPump, setUploadingPump] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Camera file inputs refs
  const dashboardInputRef = useRef(null);
  const pumpInputRef = useRef(null);

  const showNotification = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, 5000);
  };

  const loadPendingVehicles = async () => {
    setLoading(true);
    try {
      const res = await fuelingService.getPendingVehicles();
      setPendingVehicles(res.data.vehicles || []);
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Erro ao carregar veículos pendentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingVehicles();
  }, []);

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setRawKm(null);
    setUserTotalCost(null);
    setUserPricePerLiter(null);
    setUserLiters(null);
    setActiveFields([]);
    setPhotoDashboard(null);
    setPhotoPump(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setSelectedVehicle(null);
  };

  // ========================================================
  // PURE DERIVED 2-OF-3 CALCULATION (NO LOOPS, NO OVERWRITES)
  // ========================================================
  let calculatedField = null; // 'totalCost' | 'pricePerLiter' | 'liters' | null
  let calculatedTotalCost = null;
  let calculatedPricePerLiter = null;
  let calculatedLiters = null;

  if (activeFields.length === 2) {
    if (activeFields.includes('totalCost') && activeFields.includes('liters')) {
      calculatedField = 'pricePerLiter';
      if (userLiters && userLiters > 0 && userTotalCost && userTotalCost > 0) {
        calculatedPricePerLiter = parseFloat((userTotalCost / userLiters).toFixed(2));
      }
    } else if (activeFields.includes('totalCost') && activeFields.includes('pricePerLiter')) {
      calculatedField = 'liters';
      if (userPricePerLiter && userPricePerLiter > 0 && userTotalCost && userTotalCost > 0) {
        calculatedLiters = parseFloat((userTotalCost / userPricePerLiter).toFixed(2));
      }
    } else if (activeFields.includes('pricePerLiter') && activeFields.includes('liters')) {
      calculatedField = 'totalCost';
      if (userPricePerLiter && userPricePerLiter > 0 && userLiters && userLiters > 0) {
        calculatedTotalCost = parseFloat((userPricePerLiter * userLiters).toFixed(2));
      }
    }
  }

  // Effective numeric values
  const effectiveTotalCost = calculatedField === 'totalCost' ? calculatedTotalCost : userTotalCost;
  const effectivePricePerLiter = calculatedField === 'pricePerLiter' ? calculatedPricePerLiter : userPricePerLiter;
  const effectiveLiters = calculatedField === 'liters' ? calculatedLiters : userLiters;

  const formatMoney = (val) => {
    if (val === null || val === undefined || isNaN(val) || val <= 0) return '';
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatLiters = (val) => {
    if (val === null || val === undefined || isNaN(val) || val <= 0) return '';
    return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
  };

  const totalCostDisplay = formatMoney(effectiveTotalCost);
  const pricePerLiterDisplay = formatMoney(effectivePricePerLiter);
  const litersDisplay = formatLiters(effectiveLiters);
  const kmDisplay = rawKm !== null ? `${rawKm.toLocaleString('pt-BR')} km` : '';

  // 1. VALOR TOTAL
  const handleTotalCostChange = (e) => {
    if (calculatedField === 'totalCost') return;
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits || parseInt(digits, 10) === 0) {
      setUserTotalCost(null);
      setActiveFields(prev => prev.filter(f => f !== 'totalCost'));
      return;
    }
    const num = parseInt(digits, 10) / 100;
    setUserTotalCost(num);
    setActiveFields(prev => {
      if (prev.includes('totalCost')) return prev;
      if (prev.length < 2) return [...prev, 'totalCost'];
      return prev;
    });
  };

  // 2. VALOR DO LITRO
  const handlePriceChange = (e) => {
    if (calculatedField === 'pricePerLiter') return;
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits || parseInt(digits, 10) === 0) {
      setUserPricePerLiter(null);
      setActiveFields(prev => prev.filter(f => f !== 'pricePerLiter'));
      return;
    }
    const num = parseInt(digits, 10) / 100;
    setUserPricePerLiter(num);
    setActiveFields(prev => {
      if (prev.includes('pricePerLiter')) return prev;
      if (prev.length < 2) return [...prev, 'pricePerLiter'];
      return prev;
    });
  };

  // 3. LITROS
  const handleLitersChange = (e) => {
    if (calculatedField === 'liters') return;
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits || parseInt(digits, 10) === 0) {
      setUserLiters(null);
      setActiveFields(prev => prev.filter(f => f !== 'liters'));
      return;
    }
    const num = parseInt(digits, 10) / 100;
    setUserLiters(num);
    setActiveFields(prev => {
      if (prev.includes('liters')) return prev;
      if (prev.length < 2) return [...prev, 'liters'];
      return prev;
    });
  };

  // 4. QUILOMETRAGEM (KM)
  const handleKmChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits || parseInt(digits, 10) === 0) {
      setRawKm(null);
      return;
    }
    const num = parseInt(digits, 10);
    setRawKm(num);
  };

  // Upload handler for photos
  const handleFileUpload = async (file, type) => {
    if (!file) return;

    if (type === 'dashboard') setUploadingDashboard(true);
    if (type === 'pump') setUploadingPump(true);

    try {
      const res = await uploadService.uploadFile(file);
      const url = res.data.url;
      if (type === 'dashboard') setPhotoDashboard(url);
      if (type === 'pump') setPhotoPump(url);
      showNotification('success', `Foto ${type === 'dashboard' ? 'do painel' : 'da bomba'} anexada com sucesso!`);
    } catch (err) {
      showNotification('error', 'Erro ao enviar foto. Tente novamente.');
    } finally {
      if (type === 'dashboard') setUploadingDashboard(false);
      if (type === 'pump') setUploadingPump(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicle || submitting) return;

    const isOdoWorking = selectedVehicle.odometer_working === 1;

    // Strict Validations with clear error messages
    if (isOdoWorking) {
      if (!rawKm || isNaN(rawKm) || rawKm <= 0) {
        showNotification('error', 'Informe a quilometragem atual do painel.');
        return;
      }
      if (!photoDashboard) {
        showNotification('error', 'A foto do painel (odômetro) é obrigatória.');
        return;
      }
    }

    if (!effectiveLiters || isNaN(effectiveLiters) || effectiveLiters <= 0) {
      showNotification('error', 'Informe a quantidade de litros (preencha 2 campos para calcular automaticamente).');
      return;
    }
    if (!effectivePricePerLiter || isNaN(effectivePricePerLiter) || effectivePricePerLiter <= 0) {
      showNotification('error', 'Informe o valor do litro (preencha 2 campos para calcular automaticamente).');
      return;
    }
    if (!effectiveTotalCost || isNaN(effectiveTotalCost) || effectiveTotalCost <= 0) {
      showNotification('error', 'Informe o valor total abastecido (preencha 2 campos para calcular automaticamente).');
      return;
    }
    if (!photoPump) {
      showNotification('error', 'A foto da bomba é obrigatória.');
      return;
    }

    setSubmitting(true);
    try {
      await fuelingService.submitEmployeeFueling({
        vehicle_id: selectedVehicle.id,
        km_current: isOdoWorking ? rawKm : null,
        liters: effectiveLiters,
        price_per_liter: effectivePricePerLiter,
        total_cost: effectiveTotalCost,
        photo_dashboard_url: photoDashboard,
        photo_pump_url: photoPump,
        fuel_type: selectedVehicle.fuel_type_default
      });

      // Show success message
      showNotification('success', '✓ Abastecimento registrado com sucesso');

      // Reset and reload pending vehicles
      setSelectedVehicle(null);
      await loadPendingVehicles();
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Erro ao registrar abastecimento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Mobile-First Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3.5 sticky top-0 z-30 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
            <Fuel className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-tight leading-none">
              Gerenciamento de Frota
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Olá, <strong className="text-emerald-400 font-semibold">{user?.name || 'Funcionário'}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/60 text-xs font-semibold transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full pb-16">
        {/* Toast Feedback */}
        {feedback.message && (
          <div
            className={`mb-4 p-4 rounded-2xl border flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-3 ${
              feedback.type === 'error'
                ? 'bg-rose-950/90 border-rose-600/50 text-rose-200'
                : 'bg-emerald-950/90 border-emerald-600/50 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <span className="text-xs font-bold">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback({ type: '', message: '' })}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Carregando veículos...</p>
          </div>
        ) : selectedVehicle ? (
          /* FORM VIEW: ABASTECER VEÍCULO SELECIONADO */
          <div className="space-y-4">
            {/* Back Button */}
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white py-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para lista de veículos
            </button>

            {/* Vehicle Card Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center gap-4">
              {selectedVehicle.photo_url ? (
                <img
                  src={selectedVehicle.photo_url}
                  alt={selectedVehicle.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-700/60 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                  <Truck className="w-8 h-8" />
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  {selectedVehicle.fuel_type_default || 'Diesel S10'}
                </span>
                <h2 className="text-xl font-black text-white truncate mt-1">
                  {selectedVehicle.name}
                </h2>
                <p className="text-xs text-slate-300 font-mono tracking-wide font-bold">
                  Placa: <strong className="text-emerald-400">{selectedVehicle.plate}</strong>
                </p>
              </div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                Dados do Abastecimento
              </h3>

              {/* 1. QUILOMETRAGEM ATUAL (if odometer is working) */}
              {selectedVehicle.odometer_working === 1 ? (
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-blue-400" />
                    QUILOMETRAGEM ATUAL (KM) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    placeholder="Ex: 266.251 km"
                    value={kmDisplay}
                    onChange={handleKmChange}
                    className="w-full text-lg font-bold px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Digite os números do painel (ex: <strong className="text-slate-300">266251</strong> para <strong className="text-emerald-400">266.251 km</strong>).
                  </p>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-300 flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
                  <span>Veículo sem odômetro funcional cadastrado. Não é necessário informar KM.</span>
                </div>
              )}

              {/* 2. QUANTIDADE DE LITROS & VALOR DO LITRO */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    ⛽ Valores (Preencha 2 campos)
                  </span>
                  {calculatedField && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      🔒 3º campo calculado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* QUANTIDADE DE LITROS */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                        QUANTIDADE DE LITROS <span className="text-rose-400">*</span>
                      </span>
                      {calculatedField === 'liters' && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          🔒 Automático
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      inputMode={calculatedField === 'liters' ? 'none' : 'numeric'}
                      pattern="[0-9]*"
                      autoComplete="off"
                      placeholder="Ex: 32,19 L"
                      value={litersDisplay}
                      onChange={handleLitersChange}
                      readOnly={calculatedField === 'liters'}
                      tabIndex={calculatedField === 'liters' ? -1 : 0}
                      className={`w-full text-lg font-bold px-4 py-3.5 rounded-2xl transition-all ${
                        calculatedField === 'liters'
                          ? 'bg-slate-950/80 border border-emerald-500/40 text-emerald-300 cursor-not-allowed select-none opacity-90'
                          : 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500'
                      }`}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {calculatedField === 'liters' ? 'Calculado automaticamente (Total ÷ Preço)' : 'Ex: digite 3219 para 32,19 L'}
                    </p>
                  </div>

                  {/* VALOR DO LITRO */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        VALOR DO LITRO <span className="text-rose-400">*</span>
                      </span>
                      {calculatedField === 'pricePerLiter' && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          🔒 Automático
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      inputMode={calculatedField === 'pricePerLiter' ? 'none' : 'numeric'}
                      pattern="[0-9]*"
                      autoComplete="off"
                      placeholder="Ex: R$ 6,97"
                      value={pricePerLiterDisplay}
                      onChange={handlePriceChange}
                      readOnly={calculatedField === 'pricePerLiter'}
                      tabIndex={calculatedField === 'pricePerLiter' ? -1 : 0}
                      className={`w-full text-lg font-bold px-4 py-3.5 rounded-2xl transition-all ${
                        calculatedField === 'pricePerLiter'
                          ? 'bg-slate-950/80 border border-blue-500/40 text-blue-300 cursor-not-allowed select-none opacity-90'
                          : 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500'
                      }`}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {calculatedField === 'pricePerLiter' ? 'Calculado automaticamente (Total ÷ Litros)' : 'Ex: digite 697 para R$ 6,97'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. VALOR TOTAL ABASTECIDO */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    VALOR TOTAL ABASTECIDO <span className="text-rose-400">*</span>
                  </span>
                  {calculatedField === 'totalCost' && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      🔒 Automático
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  inputMode={calculatedField === 'totalCost' ? 'none' : 'numeric'}
                  pattern="[0-9]*"
                  autoComplete="off"
                  placeholder="Ex: R$ 221,16"
                  value={totalCostDisplay}
                  onChange={handleTotalCostChange}
                  readOnly={calculatedField === 'totalCost'}
                  tabIndex={calculatedField === 'totalCost' ? -1 : 0}
                  className={`w-full text-xl font-black px-4 py-3.5 rounded-2xl transition-all ${
                    calculatedField === 'totalCost'
                      ? 'bg-slate-950/80 border border-emerald-500/40 text-emerald-300 cursor-not-allowed select-none opacity-90'
                      : 'bg-slate-800 border border-slate-700 text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500'
                  }`}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {calculatedField === 'totalCost' ? 'Calculado automaticamente (Preço × Litros)' : 'Ex: digite 22116 para R$ 221,16'}
                </p>
              </div>

              {/* 4. COMPROVANTES & FOTOS */}
              <div className="space-y-3.5 pt-3 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  📷 Comprovantes & Fotos
                </span>

                {/* FOTO DO PAINEL (se odômetro funcional) */}
                {selectedVehicle.odometer_working === 1 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      FOTO DO PAINEL (ODÔMETRO) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={dashboardInputRef}
                      onChange={(e) => handleFileUpload(e.target.files[0], 'dashboard')}
                      className="hidden"
                    />

                    {photoDashboard ? (
                      <div className="rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 p-3 flex items-center justify-between gap-3 shadow-inner">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={photoDashboard}
                            alt="Painel"
                            className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 shrink-0" /> Foto Anexada
                            </span>
                            <p className="text-[10px] text-slate-400 truncate">Painel registrado com sucesso</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => dashboardInputRef.current?.click()}
                          className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-400" /> Tirar novamente
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => dashboardInputRef.current?.click()}
                        disabled={uploadingDashboard}
                        className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-800/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-98"
                      >
                        <Camera className="w-6 h-6 text-emerald-400" />
                        <span className="text-xs font-bold">
                          {uploadingDashboard ? 'Enviando foto...' : '📷 Tirar foto do painel'}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* FOTO DA BOMBA */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    FOTO DA BOMBA <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={pumpInputRef}
                    onChange={(e) => handleFileUpload(e.target.files[0], 'pump')}
                    className="hidden"
                  />

                  {photoPump ? (
                    <div className="rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 p-3 flex items-center justify-between gap-3 shadow-inner">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={photoPump}
                          alt="Bomba"
                          className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 shrink-0" /> Foto Anexada
                          </span>
                          <p className="text-[10px] text-slate-400 truncate">Bomba registrada com sucesso</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => pumpInputRef.current?.click()}
                        className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-400" /> Tirar novamente
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => pumpInputRef.current?.click()}
                      disabled={uploadingPump}
                      className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-800/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-98"
                    >
                      <Camera className="w-6 h-6 text-emerald-400" />
                      <span className="text-xs font-bold">
                        {uploadingPump ? 'Enviando foto...' : '📷 Tirar foto da bomba'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* 5. SUBMIT BUTTON */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Salvando Abastecimento...' : 'FINALIZAR ABASTECIMENTO'}
                </button>
              </div>
            </form>
          </div>
        ) : pendingVehicles.length === 0 ? (
          /* CONCLUDED STATE: ALL VEHICLES FUELED */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl my-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Semana Concluída
              </span>
              <h2 className="text-2xl font-black text-white">
                Abastecimentos Concluídos!
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Todos os veículos desta semana já foram abastecidos. Não há nenhum veículo pendente no momento.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={logout}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-2xl border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sair do Sistema
              </button>
            </div>
          </div>
        ) : (
          /* LIST VIEW: PENDING VEHICLES FOR CURRENT WEEK */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">
                  Veículos para Abastecer
                </h2>
                <p className="text-xs text-slate-400">
                  Selecione um veículo para registrar o abastecimento
                </p>
              </div>
              <button
                onClick={loadPendingVehicles}
                title="Atualizar lista"
                className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* VEHICLES CARDS LIST */}
            <div className="space-y-3">
              {pendingVehicles.map((v) => (
                <div
                  key={v.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-4 shadow-lg flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {v.photo_url ? (
                      <img
                        src={v.photo_url}
                        alt={v.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-700/60 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                        <Truck className="w-7 h-7" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-white text-base truncate">
                        {v.name}
                      </h3>
                      <p className="text-xs font-mono font-bold text-slate-400 tracking-wider">
                        Placa: <strong className="text-emerald-400">{v.plate}</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectVehicle(v)}
                    className="py-3 px-5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-950/40 shrink-0 cursor-pointer transition-all"
                  >
                    ABASTECER
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
