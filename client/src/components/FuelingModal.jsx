import React, { useState, useEffect } from 'react';
import {
  X,
  Fuel,
  Gauge,
  Check,
  ChevronRight,
  Droplets,
  DollarSign,
  AlertCircle,
  Sparkles,
  Truck,
  ArrowRight,
  Info
} from 'lucide-react';
import { useFuelingCart } from '../context/FuelingCartContext';
import { vehicleService } from '../services/api';

export default function FuelingModal({
  vehicle,
  existingRecord = null,
  isOpen,
  onClose,
  onNextVehicle,
  onViewCart
}) {
  const { addToCart, updateCartItem } = useFuelingCart();

  // 3 Fuel variables (User fills any 2, 3rd is auto-calculated)
  const [totalCost, setTotalCost] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [liters, setLiters] = useState('');
  const [autoCalculatedField, setAutoCalculatedField] = useState(null); // 'total' | 'price' | 'liters' | null
  const [lastEditedPair, setLastEditedPair] = useState([]); // tracking last 2 inputs touched

  // Odometer & KM
  const [kmPrevious, setKmPrevious] = useState(null);
  const [kmCurrent, setKmCurrent] = useState('');
  const [kmDriven, setKmDriven] = useState(null);
  const [consumptionKml, setConsumptionKml] = useState(null);
  const [costPerKm, setCostPerKm] = useState(null);

  // Mandatory Fuel selection (starts empty for Flex vehicles)
  const [fuelType, setFuelType] = useState('');

  // UI Flow State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successAdded, setSuccessAdded] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const isOdometerWorking = vehicle?.odometer_working === 1;
  const rawDefaultFuel = vehicle?.fuel_type_default || vehicle?.fuel_type || '';
  const isFlex = rawDefaultFuel.toUpperCase().includes('FLEX');
  const fuelOptions = isFlex
    ? ['Gasolina', 'Etanol']
    : rawDefaultFuel.toUpperCase().includes('DIESEL')
    ? ['Diesel S10', 'Diesel Comum']
    : ['Gasolina', 'Etanol', 'Diesel S10', 'Diesel Comum', 'GNV'];

  // Initialize or populate when vehicle / existingRecord changes
  useEffect(() => {
    if (!vehicle || !isOpen) return;

    setErrorMsg('');
    setSuccessAdded(false);
    setDuplicateWarning(null);

    if (existingRecord) {
      setTotalCost(existingRecord.total_cost ? String(existingRecord.total_cost) : '');
      setPricePerLiter(existingRecord.price_per_liter ? String(existingRecord.price_per_liter) : '');
      setLiters(existingRecord.liters ? String(existingRecord.liters) : '');
      setAutoCalculatedField(null);
      setKmPrevious(existingRecord.km_previous || null);
      setKmCurrent(existingRecord.km_current ? String(existingRecord.km_current) : '');
      const existFuel = existingRecord.fuel_type || '';
      setFuelType(existFuel.toUpperCase() === 'FLEX' ? '' : existFuel);
    } else {
      // All values start STRICTLY BLANK / EMPTY (Item 36)
      setPricePerLiter('');
      setTotalCost('');
      setLiters('');
      setAutoCalculatedField(null);
      setLastEditedPair([]);
      setKmCurrent('');
      setKmDriven(null);
      setConsumptionKml(null);
      setCostPerKm(null);

      // Flex vehicles MUST prompt explicit choice (Item 38)
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
            if (res.data?.last_km) {
              setKmPrevious(res.data.last_km);
            } else if (vehicle.last_km) {
              setKmPrevious(vehicle.last_km);
            }
          })
          .catch(() => {
            if (vehicle.last_km) setKmPrevious(vehicle.last_km);
          });
      }
    }
  }, [vehicle, existingRecord, isOpen, isOdometerWorking, isFlex, rawDefaultFuel]);

  // Handle Input Changes with "2 of 3" Auto-calculation Logic
  const handleTotalChange = (val) => {
    setTotalCost(val);
    const numTotal = parseFloat(val);
    const numPrice = parseFloat(pricePerLiter);
    const numLiters = parseFloat(liters);

    // If Price is valid, calculate Liters = Total / Price
    if (!isNaN(numTotal) && numTotal > 0 && !isNaN(numPrice) && numPrice > 0 && lastEditedPair.includes('price')) {
      const calcLiters = (numTotal / numPrice).toFixed(2);
      setLiters(calcLiters);
      setAutoCalculatedField('liters');
    }
    // If Liters is valid, calculate Price = Total / Liters
    else if (!isNaN(numTotal) && numTotal > 0 && !isNaN(numLiters) && numLiters > 0) {
      const calcPrice = (numTotal / numLiters).toFixed(2);
      setPricePerLiter(calcPrice);
      setAutoCalculatedField('price');
    }
    setLastEditedPair(['total', lastEditedPair[0] === 'total' ? lastEditedPair[1] : lastEditedPair[0]]);
  };

  const handlePriceChange = (val) => {
    setPricePerLiter(val);
    const numPrice = parseFloat(val);
    const numTotal = parseFloat(totalCost);
    const numLiters = parseFloat(liters);

    // If Total is valid, calculate Liters = Total / Price
    if (!isNaN(numPrice) && numPrice > 0 && !isNaN(numTotal) && numTotal > 0 && lastEditedPair.includes('total')) {
      const calcLiters = (numTotal / numPrice).toFixed(2);
      setLiters(calcLiters);
      setAutoCalculatedField('liters');
    }
    // If Liters is valid, calculate Total = Price * Liters
    else if (!isNaN(numPrice) && numPrice > 0 && !isNaN(numLiters) && numLiters > 0) {
      const calcTotal = (numPrice * numLiters).toFixed(2);
      setTotalCost(calcTotal);
      setAutoCalculatedField('total');
    }
    setLastEditedPair(['price', lastEditedPair[0] === 'price' ? lastEditedPair[1] : lastEditedPair[0]]);
  };

  const handleLitersChange = (val) => {
    setLiters(val);
    const numLiters = parseFloat(val);
    const numPrice = parseFloat(pricePerLiter);
    const numTotal = parseFloat(totalCost);

    // If Price is valid, calculate Total = Price * Liters
    if (!isNaN(numLiters) && numLiters > 0 && !isNaN(numPrice) && numPrice > 0 && lastEditedPair.includes('price')) {
      const calcTotal = (numPrice * numLiters).toFixed(2);
      setTotalCost(calcTotal);
      setAutoCalculatedField('total');
    }
    // If Total is valid, calculate Price = Total / Liters
    else if (!isNaN(numLiters) && numLiters > 0 && !isNaN(numTotal) && numTotal > 0) {
      const calcPrice = (numTotal / numLiters).toFixed(2);
      setPricePerLiter(calcPrice);
      setAutoCalculatedField('price');
    }
    setLastEditedPair(['liters', lastEditedPair[0] === 'liters' ? lastEditedPair[1] : lastEditedPair[0]]);
  };

  // Dynamic real-time calculation for KM & Consumption (Item 5)
  useEffect(() => {
    if (!isOdometerWorking) return;

    const current = parseFloat(kmCurrent);
    const previous = parseFloat(kmPrevious);
    const numLiters = parseFloat(liters);
    const numTotal = parseFloat(totalCost);

    if (!isNaN(current) && !isNaN(previous) && current >= previous) {
      const driven = parseFloat((current - previous).toFixed(1));
      setKmDriven(driven);

      if (!isNaN(numLiters) && numLiters > 0) {
        setConsumptionKml(parseFloat((driven / numLiters).toFixed(2)));
      } else {
        setConsumptionKml(null);
      }

      if (!isNaN(numTotal) && numTotal > 0 && driven > 0) {
        setCostPerKm(parseFloat((numTotal / driven).toFixed(2)));
      } else {
        setCostPerKm(null);
      }
    } else {
      setKmDriven(null);
      setConsumptionKml(null);
      setCostPerKm(null);
    }
  }, [kmCurrent, kmPrevious, liters, totalCost, isOdometerWorking]);

  // Submit Handler
  const handleSubmit = async (forceDuplicate = false) => {
    setErrorMsg('');

    // Mandatory Fuel Validation (Item 38)
    if (!fuelType || fuelType.trim() === '' || fuelType.toUpperCase() === 'FLEX') {
      if (isFlex) {
        setErrorMsg('Selecione o combustível abastecido (Gasolina ou Etanol para veículos Flex).');
      } else {
        setErrorMsg('Selecione o combustível abastecido.');
      }
      return;
    }

    const numTotal = parseFloat(totalCost);
    const numPrice = parseFloat(pricePerLiter);
    const numLiters = parseFloat(liters);

    if (isNaN(numTotal) || numTotal <= 0) {
      setErrorMsg('Informe o valor total abastecido.');
      return;
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      setErrorMsg('Informe o valor do litro.');
      return;
    }
    if (isNaN(numLiters) || numLiters <= 0) {
      setErrorMsg('Informe a quantidade de litros.');
      return;
    }

    if (isOdometerWorking) {
      if (!kmCurrent || parseFloat(kmCurrent) <= 0) {
        setErrorMsg('Informe a quilometragem atual do veículo.');
        return;
      }
      if (kmPrevious && parseFloat(kmCurrent) < parseFloat(kmPrevious)) {
        setErrorMsg(`A quilometragem atual (${kmCurrent} km) não pode ser menor que a anterior (${kmPrevious} km).`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicle_id: vehicle.id,
        fuel_type: fuelType,
        is_full_tank: 1,
        km_current: isOdometerWorking ? parseFloat(kmCurrent) : null,
        liters: numLiters,
        price_per_liter: numPrice,
        total_cost: numTotal,
        photo_dashboard_url: isOdometerWorking ? 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80' : null,
        photo_pump_url: 'https://images.unsplash.com/photo-1527018607616-a656a38cb4d9?auto=format&fit=crop&w=400&q=80'
      };

      if (existingRecord) {
        await updateCartItem(existingRecord.id, payload);
        setSuccessAdded(true);
      } else {
        const result = await addToCart(payload, forceDuplicate);
        if (result?.duplicate) {
          setDuplicateWarning(result);
          setSubmitting(false);
          return;
        }
        setSuccessAdded(true);
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
        
        {/* Header Simples (Item 4) */}
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
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Success State (Item 7) */}
          {successAdded ? (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">
                  ✅ {vehicle.name} adicionada.
                </h3>
                <p className="text-sm text-slate-300">
                  {liters} L • <strong>R$ {Number(totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </p>
                {isOdometerWorking && consumptionKml && (
                  <p className="text-xs text-emerald-400 font-bold mt-1">
                    Média: {consumptionKml} km/L • R$ {costPerKm}/km
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNextVehicle) onNextVehicle();
                  }}
                  className="py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <Fuel className="w-4 h-4" /> Abastecer próximo veículo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onViewCart) onViewCart();
                  }}
                  className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
                >
                  🛒 Ver abastecimento
                </button>
              </div>
            </div>
          ) : duplicateWarning ? (
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
                    if (onViewCart) onViewCart();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  ✏️ Editar no carrinho
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                >
                  Adicionar mesmo assim
                </button>
              </div>
            </div>
          ) : (
            /* Super Simple Fueling Form (Items 2, 3, 4, 5, 6) */
            <>
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Combustível Abastecido (Obrigatório - Item 38) */}
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

              {/* 2. Quilometragem Atual (Ocultado se odômetro quebrado - Item 6) */}
              {isOdometerWorking ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-emerald-400" /> KM Atual
                    </span>
                    {kmPrevious && (
                      <span className="text-[11px] text-slate-400 font-normal lowercase">
                        anterior: <strong className="text-slate-200">{Number(kmPrevious).toLocaleString('pt-BR')} km</strong>
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={kmPrevious ? `Ex: ${kmPrevious + 300}` : 'Ex: 232941.8'}
                    value={kmCurrent}
                    onChange={(e) => setKmCurrent(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-white font-mono font-bold text-base focus:outline-none focus:border-emerald-500 shadow-inner"
                  />
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong className="text-amber-300 block">Consumo não calculado — odômetro não funcional.</strong>
                    Não é necessário informar quilometragem.
                  </p>
                </div>
              )}

              {/* 3. Os 3 Campos de Combustível (Regra 2 de 3 - Items 3 & 4) */}
              <div className="space-y-3.5 pt-1">
                
                {/* Campo 1: Valor Total */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Valor Total Abastecido
                    </label>
                    {autoCalculatedField === 'total' && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Calculado automaticamente
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={totalCost}
                      onChange={(e) => handleTotalChange(e.target.value)}
                      className={`w-full min-h-[48px] px-4 py-3 pl-9 rounded-2xl bg-slate-800/90 border font-mono font-black text-base focus:outline-none transition-colors ${
                        autoCalculatedField === 'total'
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                          : 'border-slate-700 text-white focus:border-emerald-500'
                      }`}
                    />
                    <span className="text-sm font-bold text-slate-400 absolute left-3.5 top-3.5">R$</span>
                  </div>
                </div>

                {/* Campo 2: Valor por Litro */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-blue-400" /> Valor do Litro
                    </label>
                    {autoCalculatedField === 'price' && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Calculado automaticamente
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={pricePerLiter}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className={`w-full min-h-[48px] px-4 py-3 pl-9 rounded-2xl bg-slate-800/90 border font-mono font-bold text-base focus:outline-none transition-colors ${
                        autoCalculatedField === 'price'
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                          : 'border-slate-700 text-white focus:border-emerald-500'
                      }`}
                    />
                    <span className="text-sm font-bold text-slate-400 absolute left-3.5 top-3.5">R$</span>
                  </div>
                </div>

                {/* Campo 3: Quantidade de Litros */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-emerald-400" /> Quantidade de Litros
                    </label>
                    {autoCalculatedField === 'liters' && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Calculado automaticamente
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={liters}
                      onChange={(e) => handleLitersChange(e.target.value)}
                      className={`w-full min-h-[48px] px-4 py-3 pr-8 rounded-2xl bg-slate-800/90 border font-mono font-bold text-base focus:outline-none transition-colors ${
                        autoCalculatedField === 'liters'
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                          : 'border-slate-700 text-white focus:border-emerald-500'
                      }`}
                    />
                    <span className="text-sm font-bold text-slate-400 absolute right-3.5 top-3.5">L</span>
                  </div>
                </div>
              </div>

              {/* Helper Text (Item 4) */}
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Você só precisa preencher <strong>2 dos 3 campos</strong> de combustível. O sistema calcula o restante automaticamente.
                </span>
              </div>

              {/* Cálculos Automáticos de Consumo (Item 5) */}
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

        {/* Botão Principal: ➕ Adicionar ao abastecimento (Item 7) */}
        {!successAdded && !duplicateWarning && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 sticky bottom-0 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex-1 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 transition-all disabled:opacity-50"
            >
              {submitting ? 'Adicionando...' : '➕ Adicionar ao abastecimento'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
