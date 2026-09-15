import React, { useState, useEffect } from 'react';
import { X, Truck, Camera, Upload, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { vehicleService, uploadService } from '../services/api';

export default function VehicleFormModal({ isOpen, onClose, onSaved, vehicleToEdit = null }) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    version: '',
    color: '',
    year_fab: new Date().getFullYear(),
    year_model: new Date().getFullYear(),
    plate: '',
    renavam: '',
    chassi: '',
    crlv_number: '',
    owner_name: '',
    owner_doc: '',
    uf: 'SP',
    city: 'São Paulo',
    license_date: '',
    license_year: new Date().getFullYear(),
    fuel_type_default: 'Diesel S10',
    tank_capacity: 100,
    photo_url: '',
    notes: '',
    status: 'working',
    status_reason: '',
    status_workshop: '',
    status_return_forecast: '',
    odometer_working: 1,
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (vehicleToEdit) {
      setFormData({
        ...vehicleToEdit,
        year_fab: vehicleToEdit.year_fab || new Date().getFullYear(),
        year_model: vehicleToEdit.year_model || new Date().getFullYear(),
        odometer_working: vehicleToEdit.odometer_working !== undefined ? vehicleToEdit.odometer_working : 1,
        tank_capacity: vehicleToEdit.tank_capacity || 100,
      });
    } else {
      setFormData({
        name: '',
        brand: '',
        model: '',
        version: '',
        color: 'Branco',
        year_fab: new Date().getFullYear(),
        year_model: new Date().getFullYear(),
        plate: '',
        renavam: '',
        chassi: '',
        crlv_number: '',
        owner_name: '',
        owner_doc: '',
        uf: 'SP',
        city: 'São Paulo',
        license_date: '',
        license_year: new Date().getFullYear(),
        fuel_type_default: 'Diesel S10',
        tank_capacity: 100,
        photo_url: '',
        notes: '',
        status: 'working',
        status_reason: '',
        status_workshop: '',
        status_return_forecast: '',
        odometer_working: 1,
      });
    }
    setErrorMsg('');
  }, [vehicleToEdit, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const res = await uploadService.uploadFile(file);
      handleChange('photo_url', res.data.url);
    } catch (err) {
      alert('Erro ao enviar foto do veículo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name || !formData.brand || !formData.model || !formData.plate) {
      setErrorMsg('Preencha os campos obrigatórios: Nome, Marca, Modelo e Placa.');
      return;
    }

    setSubmitting(true);
    try {
      if (vehicleToEdit) {
        await vehicleService.update(vehicleToEdit.id, formData);
      } else {
        await vehicleService.create(formData);
      }
      onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Erro ao salvar dados do veículo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {vehicleToEdit ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
              </h2>
              <p className="text-xs text-slate-400">Preencha as informações do veículo e documentação</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Identificação */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              1. Identificação do Veículo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome / Apelido do Veículo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mercedes 710, Fiorino 01, Saveiro Branca"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Placa <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="ABC1D23"
                  value={formData.plate}
                  onChange={(e) => handleChange('plate', e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 font-mono font-bold text-sm text-white focus:outline-none focus:border-emerald-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Marca <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Mercedes-Benz, Volkswagen..."
                  value={formData.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Modelo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="710, Delivery, Fiorino..."
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Versão</label>
                <input
                  type="text"
                  placeholder="Plus, 1.4 EVO, 8.160..."
                  value={formData.version || ''}
                  onChange={(e) => handleChange('version', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cor</label>
                <input
                  type="text"
                  placeholder="Branco, Prata, Preto..."
                  value={formData.color || ''}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Ano Fabricação</label>
                <input
                  type="number"
                  placeholder="2018"
                  value={formData.year_fab || ''}
                  onChange={(e) => handleChange('year_fab', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Ano Modelo</label>
                <input
                  type="number"
                  placeholder="2019"
                  value={formData.year_model || ''}
                  onChange={(e) => handleChange('year_model', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Odometer Configuration (Item 8) */}
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              2. Odômetro e Quilometragem
            </h3>
            <p className="text-xs text-slate-400">
              O odômetro / marcador de quilometragem deste veículo está funcionando?
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleChange('odometer_working', 1)}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  formData.odometer_working === 1
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                ✅ Sim, funcionando
              </button>
              <button
                type="button"
                onClick={() => handleChange('odometer_working', 0)}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  formData.odometer_working === 0
                    ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                ❌ Não funcionando
              </button>
            </div>
          </div>

          {/* Section 3: Combustível & Tanque */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              3. Combustível e Capacidade
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Combustível Padrão</label>
                <select
                  value={formData.fuel_type_default}
                  onChange={(e) => handleChange('fuel_type_default', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Diesel S10">Diesel S10</option>
                  <option value="Diesel Comum">Diesel Comum</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Etanol">Etanol</option>
                  <option value="GNV">GNV</option>
                  <option value="Flex">Flex (Gasolina / Etanol)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Capacidade do Tanque (Litros)</label>
                <input
                  type="number"
                  placeholder="Ex: 80"
                  value={formData.tank_capacity || ''}
                  onChange={(e) => handleChange('tank_capacity', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Documentação (CRLV, Renavam, Chassi) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              4. Documentação e Registro
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">RENAVAM</label>
                <input
                  type="text"
                  placeholder="00123456789"
                  value={formData.renavam || ''}
                  onChange={(e) => handleChange('renavam', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Número do Chassi</label>
                <input
                  type="text"
                  placeholder="9BM..."
                  value={formData.chassi || ''}
                  onChange={(e) => handleChange('chassi', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Número do CRLV</label>
                <input
                  type="text"
                  placeholder="123456789"
                  value={formData.crlv_number || ''}
                  onChange={(e) => handleChange('crlv_number', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Proprietário / Razão Social</label>
                <input
                  type="text"
                  placeholder="Nome ou empresa no documento"
                  value={formData.owner_name || ''}
                  onChange={(e) => handleChange('owner_name', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">CPF / CNPJ</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={formData.owner_doc || ''}
                  onChange={(e) => handleChange('owner_doc', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Foto do Veículo */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              5. Foto do Veículo
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                {formData.photo_url ? (
                  <img src={formData.photo_url} alt="Veículo" className="w-full h-full object-cover" />
                ) : (
                  <Truck className="w-10 h-10 text-slate-600" />
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer border border-slate-700 transition-colors">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  {uploadingPhoto ? 'Enviando...' : 'Carregar Foto'}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                </label>
                <p className="text-[11px] text-slate-500 mt-1">Formatos JPG, PNG ou WEBP até 10MB</p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-800 bg-slate-900 sticky bottom-0 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Salvando...' : (vehicleToEdit ? 'Salvar Alterações' : 'Cadastrar Veículo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
