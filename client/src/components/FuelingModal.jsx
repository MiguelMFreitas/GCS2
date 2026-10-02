import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Fuel,
  Gauge,
  Check,
  Droplets,
  DollarSign,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Trash2,
  Calendar,
  Eye,
  Loader2
} from 'lucide-react';
import { useFuelingCart } from '../context/FuelingCartContext';
import { vehicleService, uploadService, fuelingService } from '../services/api';

export default function FuelingModal({
  vehicle,
  existingRecord = null,
  isOpen,
  onClose,
  onSuccess
}) {
  const { addToCart, updateCartItem } = useFuelingCart();

  // Date
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);

  // 3 Fuel variables (Raw numeric inputs typed by user)
  const [userTotalCost, setUserTotalCost] = useState(null);
  const [userPricePerLiter, setUserPricePerLiter] = useState(null);
  const [userLiters, setUserLiters] = useState(null);
  const [activeFields, setActiveFields] = useState([]); // tracks up to 2 user-filled fields

  // Odometer & KM (Raw numeric + Display)
  const [kmPrevious, setKmPrevious] = useState(null);
  const [rawKmCurrent, setRawKmCurrent] = useState(null);

  const [kmDriven, setKmDriven] = useState(null);
  const [consumptionKml, setConsumptionKml] = useState(null);
  const [costPerKm, setCostPerKm] = useState(null);

  // Photos
  const [photoDashboardUrl, setPhotoDashboardUrl] = useState('');
  const [photoPumpUrl, setPhotoPumpUrl] = useState('');
  const [uploadingDashboard, setUploadingDashboard] = useState(false);
  const [uploadingPump, setUploadingPump] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState(null);

  // Mandatory Fuel selection
  const [fuelType, setFuelType] = useState('');

  // UI Flow State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const dashboardCameraRef = useRef(null);
  const dashboardGalleryRef = useRef(null);
  const pumpCameraRef = useRef(null);
  const pumpGalleryRef = useRef(null);

  const isOdometerWorking = vehicle?.odometer_working === 1;
  const rawDefaultFuel = vehicle?.fuel_type_default || vehicle?.fuel_type || '';
  const isFlex = rawDefaultFuel.toUpperCase().includes('FLEX');
  const fuelOptions = isFlex
    ? ['Gasolina', 'Etanol']
    : rawDefaultFuel.toUpperCase().includes('DIESEL')
    ? ['Diesel S10', 'Diesel Comum']
    : ['Gasolina', 'Etanol', 'Diesel S10', 'Diesel Comum', 'GNV'];

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

  const formatNumberPtBr = (val) => {
    if (val === null || val === undefined || isNaN(val) || val <= 0) return '';
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalCostDisplay = formatNumberPtBr(effectiveTotalCost);
  const pricePerLiterDisplay = formatNumberPtBr(effectivePricePerLiter);
  const litersDisplay = formatNumberPtBr(effectiveLiters);
  const kmCurrentDisplay = rawKmCurrent !== null ? rawKmCurrent.toLocaleString('pt-BR') : '';

  const resetForm = () => {
    setFuelDate(new Date().toISOString().split('T')[0]);
    setUserTotalCost(null);
    setUserPricePerLiter(null);
    setUserLiters(null);
    setActiveFields([]);
    setRawKmCurrent(null);
    setKmDriven(null);
    setConsumptionKml(null);
    setCostPerKm(null);
    setPhotoDashboardUrl('');
    setPhotoPumpUrl('');
    setErrorMsg('');
    setDuplicateWarning(null);
  };

  // Initialize or populate when vehicle / existingRecord changes
  useEffect(() => {
    if (!vehicle || !isOpen) return;

    setErrorMsg('');
    setDuplicateWarning(null);

    if (existingRecord) {
      setFuelDate(existingRecord.session_date || existingRecord.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]);
      
      const numTotal = Number(existingRecord.total_cost) || 0;
      const numPrice = Number(existingRecord.price_per_liter) || 0;
      const numL = Number(existingRecord.liters) || 0;

      setUserPricePerLiter(numPrice > 0 ? numPrice : null);
      setUserLiters(numL > 0 ? numL : null);
      setUserTotalCost(null);
      setActiveFields(['pricePerLiter', 'liters']);

      setKmPrevious(existingRecord.km_previous !== undefined && existingRecord.km_previous !== null ? existingRecord.km_previous : null);
      if (existingRecord.km_current !== undefined && existingRecord.km_current !== null && existingRecord.km_current !== '') {
        setRawKmCurrent(Number(existingRecord.km_current));
      } else {
        setRawKmCurrent(null);
      }

      setPhotoDashboardUrl(existingRecord.photo_dashboard_url || existingRecord.dashboard_photo_url || '');
      setPhotoPumpUrl(existingRecord.photo_pump_url || existingRecord.pump_photo_url || '');
      const existFuel = existingRecord.fuel_type || '';
      setFuelType(existFuel.toUpperCase() === 'FLEX' ? '' : existFuel);
    } else {
      resetForm();

      if (isFlex) {
        setFuelType('');
      } else if (rawDefaultFuel && rawDefaultFuel.toUpperCase() !== 'FLEX') {
        setFuelType(rawDefaultFuel);
      } else {
        setFuelType('');
      }

      // Fetch last KM for this vehicle
      if (isOdometerWorking) {
        vehicleService.getLastOdometer(vehicle.id)
          .then((res) => {
            if (res.data?.last_km !== undefined && res.data?.last_km !== null) {
              setKmPrevious(res.data.last_km);
            } else if (vehicle.last_km !== undefined && vehicle.last_km !== null) {
              setKmPrevious(vehicle.last_km);
            }
          })
          .catch(() => {
            if (vehicle.last_km !== undefined && vehicle.last_km !== null) setKmPrevious(vehicle.last_km);
          });
      }
    }
  }, [vehicle, existingRecord, isOpen, isOdometerWorking, isFlex, rawDefaultFuel]);

  // ========================================================
  // PROGRESSIVE NUMBER MASKS (DYNAMIC SHIFTING, NO COMMA TYPING)
  // ========================================================

  // 1. VALOR TOTAL: 1 -> 0,01 | 12 -> 0,12 | 123 -> 1,23 | 1234 -> 12,34 | 12345 -> 123,45
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
    if (errorMsg) setErrorMsg('');
  };

  // 2. VALOR DO LITRO: 697 -> 6,97 | 599 -> 5,99
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
    if (errorMsg) setErrorMsg('');
  };

  // 3. QUANTIDADE DE LITROS: 3219 -> 32,19 | 4500 -> 45,00
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
    if (errorMsg) setErrorMsg('');
  };

  // 4. QUILOMETRAGEM (KM): 266251 -> 266.251 (Thousand separator, NO decimals, NO R$)
  const handleKmChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits || parseInt(digits, 10) === 0) {
      setRawKmCurrent(null);
      return;
    }
    const num = parseInt(digits, 10);
    setRawKmCurrent(num);
    if (errorMsg) setErrorMsg('');
  };

  // Dynamic real-time calculation for KM & Consumption
  useEffect(() => {
    if (!isOdometerWorking) {
      setKmDriven(null);
      setConsumptionKml(null);
      setCostPerKm(null);
      return;
    }

    const current = rawKmCurrent;
    const previous = kmPrevious !== null && kmPrevious !== undefined ? Number(kmPrevious) : null;
    const numLiters = effectiveLiters;
    const numTotal = effectiveTotalCost;

    if (current && previous !== null && current >= previous) {
      const driven = current - previous;
      setKmDriven(driven);

      if (numLiters && numLiters > 0) {
        setConsumptionKml(parseFloat((driven / numLiters).toFixed(2)));
      } else {
        setConsumptionKml(null);
      }

      if (numTotal && numTotal > 0 && driven > 0) {
        setCostPerKm(parseFloat((numTotal / driven).toFixed(2)));
      } else {
        setCostPerKm(null);
      }
    } else {
      setKmDriven(null);
      setConsumptionKml(null);
      setCostPerKm(null);
    }
  }, [rawKmCurrent, kmPrevious, effectiveLiters, effectiveTotalCost, isOdometerWorking]);

  // Photo Upload Handler
  const handlePhotoUpload = async (file, type) => {
    if (!file) return;
    if (type === 'dashboard') setUploadingDashboard(true);
    if (type === 'pump') setUploadingPump(true);
    setErrorMsg('');

    try {
      const res = await uploadService.uploadFile(file);
      const url = res.data?.url;
      if (url) {
        if (type === 'dashboard') setPhotoDashboardUrl(url);
        if (type === 'pump') setPhotoPumpUrl(url);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao fazer upload da foto. Tente novamente.');
    } finally {
      if (type === 'dashboard') setUploadingDashboard(false);
      if (type === 'pump') setUploadingPump(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (forceDuplicate = false) => {
    setErrorMsg('');

    // Mandatory Fuel Validation
    if (!fuelType || fuelType.trim() === '' || fuelType.toUpperCase() === 'FLEX') {
      if (isFlex) {
        setErrorMsg('Selecione o combustível abastecido (Gasolina ou Etanol para veículos Flex).');
      } else {
        setErrorMsg('Selecione o combustível abastecido.');
      }
      return;
    }

    if (!effectiveLiters || effectiveLiters <= 0) {
      setErrorMsg('Informe a quantidade de litros (preencha 2 campos para calcular automaticamente).');
      return;
    }
    if (!effectivePricePerLiter || effectivePricePerLiter <= 0) {
      setErrorMsg('Informe o valor do litro (preencha 2 campos para calcular automaticamente).');
      return;
    }
    if (!effectiveTotalCost || effectiveTotalCost <= 0) {
      setErrorMsg('Informe o valor total abastecido (preencha 2 campos para calcular automaticamente).');
      return;
    }

    if (isOdometerWorking) {
      if (!rawKmCurrent || rawKmCurrent <= 0) {
        setErrorMsg('Informe a quilometragem atual do veículo.');
        return;
      }
      if (kmPrevious !== null && kmPrevious !== undefined && rawKmCurrent < Number(kmPrevious)) {
        setErrorMsg(`A quilometragem atual (${rawKmCurrent.toLocaleString('pt-BR')} km) não pode ser menor que a anterior (${Number(kmPrevious).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} km).`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicle_id: vehicle.id,
        fuel_type: fuelType,
        is_full_tank: 1,
        km_current: isOdometerWorking ? rawKmCurrent : null,
        liters: effectiveLiters,
        price_per_liter: effectivePricePerLiter,
        total_cost: effectiveTotalCost,
        session_date: fuelDate,
        photo_dashboard_url: isOdometerWorking ? (photoDashboardUrl || null) : null,
        photo_pump_url: photoPumpUrl || null
      };

      if (existingRecord) {
        await fuelingService.update(existingRecord.id, payload);
        resetForm();
        if (onSuccess) {
          onSuccess(`✓ Abastecimento de ${vehicle.name} (${vehicle.plate}) atualizado com sucesso!`);
        }
        onClose();
      } else {
        const result = await addToCart(payload, forceDuplicate);
        if (result?.duplicate) {
          setDuplicateWarning(result);
          setSubmitting(false);
          return;
        }
        resetForm();
        if (onSuccess) {
          onSuccess(`✓ Abastecimento de ${vehicle.name} (${vehicle.plate}) adicionado com sucesso!`);
        }
        onClose();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Erro ao registrar abastecimento.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !vehicle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Fuel className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {vehicle.name}
                <span className="text-xs font-mono font-bold bg-white text-slate-900 px-2 py-0.5 rounded border border-slate-300">
                  {vehicle.plate}
                </span>
              </h2>
              {isOdometerWorking && kmPrevious ? (
                <p className="text-xs text-slate-400">
                  KM anterior: <strong className="text-emerald-400">{Number(kmPrevious).toLocaleString('pt-BR')} km</strong>
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  {vehicle.brand} • {vehicle.fuel_type_default || 'Diesel'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {duplicateWarning ? (
            /* Duplicate Vehicle Alert */
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-base text-white">Veículo já está no abastecimento</h4>
                  <p className="text-xs text-slate-300 mt-1">{duplicateWarning.message}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateWarning(null);
                    onClose();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                >
                  Adicionar mesmo assim
                </button>
              </div>
            </div>
          ) : (
            /* Fueling Form */
            <>
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Data do Abastecimento */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Data do Abastecimento
                </label>
                <input
                  type="date"
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-white font-medium text-sm focus:outline-none focus:border-emerald-500 shadow-inner"
                />
              </div>

              {/* 1. Combustível Abastecido */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Fuel className="w-4 h-4 text-emerald-400" /> Combustível Abastecido <span className="text-rose-400 font-bold">*</span>
                  </span>
                  {isFlex && (
                    <span className="text-[10px] text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      Veículo Flex: escolha o combustível
                    </span>
                  )}
                </label>

                <div className={`grid ${fuelOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-2`}>
                  {fuelOptions.map((fOption) => {
                    const isSelected = fuelType === fOption;
                    return (
                      <button
                        key={fOption}
                        type="button"
                        onClick={() => {
                          setFuelType(fOption);
                          if (errorMsg.includes('combustível')) setErrorMsg('');
                        }}
                        className={`min-h-[48px] py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/50 scale-[1.02]'
                            : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                        }`}
                      >
                        <Fuel className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{fOption}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Quilometragem Atual */}
              {isOdometerWorking ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-emerald-400" /> KM Atual <span className="text-rose-400 font-bold">*</span>
                    </span>
                    {kmPrevious !== null && kmPrevious !== undefined && (
                      <span className="text-[11px] text-slate-400 font-normal lowercase">
                        anterior: <strong className="text-slate-200">{Number(kmPrevious).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} km</strong>
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      placeholder={kmPrevious ? `Ex: ${(Math.floor(Number(kmPrevious)) + 300).toLocaleString('pt-BR')}` : '0'}
                      value={kmCurrentDisplay}
                      onChange={handleKmChange}
                      className="w-full min-h-[48px] px-4 py-3 pr-10 rounded-2xl bg-slate-800/90 border border-slate-700 text-white font-mono font-bold text-base focus:outline-none focus:border-emerald-500 shadow-inner"
                    />
                    <span className="text-xs font-bold text-slate-400 absolute right-3.5 top-3.5">km</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Digite os números (ex: <strong className="text-slate-300">266251</strong> para <strong className="text-emerald-400">266.251 km</strong>).
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong className="text-amber-300 block">Odômetro marcado como não funcional.</strong>
                    Não é exigido km nem foto do painel.
                  </p>
                </div>
              )}

              {/* 3. Os 3 Campos de Combustível */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    ⛽ Valores & Quantidade (Preencha 2 campos)
                  </span>
                  {calculatedField && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      🔒 3º campo calculado automaticamente
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Campo 1: Valor Total */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Valor Total
                      </span>
                      {calculatedField === 'totalCost' && (
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          🔒 Automático
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode={calculatedField === 'totalCost' ? 'none' : 'numeric'}
                        pattern="[0-9]*"
                        autoComplete="off"
                        placeholder="0,00"
                        value={totalCostDisplay}
                        onChange={handleTotalCostChange}
                        readOnly={calculatedField === 'totalCost'}
                        tabIndex={calculatedField === 'totalCost' ? -1 : 0}
                        className={`w-full min-h-[48px] px-4 py-3 pl-9 rounded-2xl font-mono font-black text-base transition-all shadow-inner ${
                          calculatedField === 'totalCost'
                            ? 'bg-slate-950/80 border border-emerald-500/40 text-emerald-300 cursor-not-allowed select-none opacity-90'
                            : 'bg-slate-800/90 border border-slate-700 text-emerald-400 focus:outline-none focus:border-emerald-500'
                        }`}
                      />
                      <span className={`text-sm font-bold absolute left-3 top-3.5 ${
                        calculatedField === 'totalCost' ? 'text-emerald-500/60' : 'text-slate-400'
                      }`}>R$</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {calculatedField === 'totalCost' ? 'Calculado (Preço × Litros)' : 'Ex: 22116 → 221,16'}
                    </span>
                  </div>

                  {/* Campo 2: Valor por Litro */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5 text-blue-400" /> Valor Litro
                      </span>
                      {calculatedField === 'pricePerLiter' && (
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          🔒 Automático
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode={calculatedField === 'pricePerLiter' ? 'none' : 'numeric'}
                        pattern="[0-9]*"
                        autoComplete="off"
                        placeholder="0,00"
                        value={pricePerLiterDisplay}
                        onChange={handlePriceChange}
                        readOnly={calculatedField === 'pricePerLiter'}
                        tabIndex={calculatedField === 'pricePerLiter' ? -1 : 0}
                        className={`w-full min-h-[48px] px-4 py-3 pl-9 rounded-2xl font-mono font-bold text-base transition-all shadow-inner ${
                          calculatedField === 'pricePerLiter'
                            ? 'bg-slate-950/80 border border-blue-500/40 text-blue-300 cursor-not-allowed select-none opacity-90'
                            : 'bg-slate-800/90 border border-slate-700 text-white focus:outline-none focus:border-emerald-500'
                        }`}
                      />
                      <span className={`text-sm font-bold absolute left-3 top-3.5 ${
                        calculatedField === 'pricePerLiter' ? 'text-blue-500/60' : 'text-slate-400'
                      }`}>R$</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {calculatedField === 'pricePerLiter' ? 'Calculado (Total ÷ Litros)' : 'Ex: 697 → 6,97'}
                    </span>
                  </div>

                  {/* Campo 3: Quantidade de Litros */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-emerald-400" /> Litros
                      </span>
                      {calculatedField === 'liters' && (
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          🔒 Automático
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode={calculatedField === 'liters' ? 'none' : 'numeric'}
                        pattern="[0-9]*"
                        autoComplete="off"
                        placeholder="0,00"
                        value={litersDisplay}
                        onChange={handleLitersChange}
                        readOnly={calculatedField === 'liters'}
                        tabIndex={calculatedField === 'liters' ? -1 : 0}
                        className={`w-full min-h-[48px] px-4 py-3 pr-8 rounded-2xl font-mono font-bold text-base transition-all shadow-inner ${
                          calculatedField === 'liters'
                            ? 'bg-slate-950/80 border border-emerald-500/40 text-emerald-300 cursor-not-allowed select-none opacity-90'
                            : 'bg-slate-800/90 border border-slate-700 text-white focus:outline-none focus:border-emerald-500'
                        }`}
                      />
                      <span className={`text-sm font-bold absolute right-3.5 top-3.5 ${
                        calculatedField === 'liters' ? 'text-emerald-500/60' : 'text-slate-400'
                      }`}>L</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {calculatedField === 'liters' ? 'Calculado (Total ÷ Preço)' : 'Ex: 3219 → 32,19'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Fotos do Abastecimento */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  📷 Comprovantes & Fotos
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Foto do Painel (se odômetro funcional) */}
                  {isOdometerWorking && (
                    <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-blue-400" /> Foto do Painel
                        </span>
                        {photoDashboardUrl && (
                          <button
                            type="button"
                            onClick={() => setPhotoDashboardUrl('')}
                            className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Remover
                          </button>
                        )}
                      </div>

                      {photoDashboardUrl ? (
                        <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
                          <img src={photoDashboardUrl} alt="Painel" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setZoomPhoto(photoDashboardUrl)}
                            className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity cursor-pointer"
                          >
                            <Eye className="w-4 h-4" /> Visualizar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            ref={dashboardCameraRef}
                            onChange={(e) => handlePhotoUpload(e.target.files?.[0], 'dashboard')}
                            className="hidden"
                          />
                          <input
                            type="file"
                            accept="image/*"
                            ref={dashboardGalleryRef}
                            onChange={(e) => handlePhotoUpload(e.target.files?.[0], 'dashboard')}
                            className="hidden"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => dashboardCameraRef.current?.click()}
                              disabled={uploadingDashboard}
                              className="py-2.5 px-3 rounded-xl bg-slate-750 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                            >
                              {uploadingDashboard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5 text-emerald-400" />}
                              Câmera
                            </button>
                            <button
                              type="button"
                              onClick={() => dashboardGalleryRef.current?.click()}
                              disabled={uploadingDashboard}
                              className="py-2.5 px-3 rounded-xl bg-slate-750 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                              Galeria
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Foto da Bomba */}
                  <div className={`p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2 ${!isOdometerWorking ? 'sm:col-span-2' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Fuel className="w-3.5 h-3.5 text-emerald-400" /> Foto da Bomba
                      </span>
                      {photoPumpUrl && (
                        <button
                          type="button"
                          onClick={() => setPhotoPumpUrl('')}
                          className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Remover
                        </button>
                      )}
                    </div>

                    {photoPumpUrl ? (
                      <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
                        <img src={photoPumpUrl} alt="Bomba" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setZoomPhoto(photoPumpUrl)}
                          className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity cursor-pointer"
                        >
                          <Eye className="w-4 h-4" /> Visualizar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          ref={pumpCameraRef}
                          onChange={(e) => handlePhotoUpload(e.target.files?.[0], 'pump')}
                          className="hidden"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          ref={pumpGalleryRef}
                          onChange={(e) => handlePhotoUpload(e.target.files?.[0], 'pump')}
                          className="hidden"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => pumpCameraRef.current?.click()}
                            disabled={uploadingPump}
                            className="py-2.5 px-3 rounded-xl bg-slate-750 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                          >
                            {uploadingPump ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5 text-emerald-400" />}
                            Câmera
                          </button>
                          <button
                            type="button"
                            onClick={() => pumpGalleryRef.current?.click()}
                            disabled={uploadingPump}
                            className="py-2.5 px-3 rounded-xl bg-slate-750 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                            Galeria
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cálculos Automáticos de Consumo */}
              {isOdometerWorking && kmDriven !== null && (
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">KM Rodados</span>
                    <strong className="text-sm font-black text-white">
                      {Number(kmDriven).toLocaleString('pt-BR')} km
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Consumo Médio</span>
                    <strong className="text-sm font-black text-emerald-400">
                      {consumptionKml ? `${consumptionKml} km/L` : '—'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Custo / KM</span>
                    <strong className="text-sm font-black text-blue-400">
                      {costPerKm ? `R$ ${costPerKm}/km` : '—'}
                    </strong>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Botão Principal: ➕ Adicionar ao abastecimento */}
        {!duplicateWarning && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 sticky bottom-0 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting || uploadingDashboard || uploadingPump}
              className="flex-1 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Salvando...' : (existingRecord ? 'Salvar alterações' : '➕ Adicionar abastecimento')}
            </button>
          </div>
        )}
      </div>

      {/* Photo Zoom Modal */}
      {zoomPhoto && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 p-2">
            <button
              onClick={() => setZoomPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-slate-950/80 text-white rounded-full hover:bg-slate-800 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={zoomPhoto} alt="Comprovante" className="w-full max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
