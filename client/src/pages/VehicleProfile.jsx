import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Truck,
  Fuel,
  Edit,
  Wrench,
  DollarSign,
  FileText,
  Calendar,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Image as ImageIcon,
  Download,
  Upload,
  ShieldCheck,
  Building,
  User,
  ExternalLink,
  Ban,
  AlertOctagon,
  ShieldAlert,
  Camera,
  Filter,
  X,
  Check,
  Eye,
  Sparkles,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';
import { vehicleService, expenseService, maintenanceService, documentService, reminderService, uploadService } from '../services/api';
import { useFuelingCart } from '../context/FuelingCartContext';
import { getStatusBadge } from '../components/VehicleCard';
import StatusChangeModal from '../components/StatusChangeModal';
import VehicleFormModal from '../components/VehicleFormModal';
import FuelingModal from '../components/FuelingModal';

export default function VehicleProfile({ vehicleId, onBack, setActiveTab }) {
  const { refreshCart } = useFuelingCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveProfileTab] = useState('fuelings');

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [newExpenseOpen, setNewExpenseOpen] = useState(false);
  const [newMaintenanceOpen, setNewMaintenanceOpen] = useState(false);
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [newReminderOpen, setNewReminderOpen] = useState(false);
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState(null);
  const [previewDocModal, setPreviewDocModal] = useState({ open: false, doc: null });

  // Delete Item Confirmation Modal
  const [deleteItemConfirm, setDeleteItemConfirm] = useState({ open: false, type: null, id: null, title: '' });

  // Status Integration Confirmation Prompt Modal
  const [statusPromptModal, setStatusPromptModal] = useState({
    open: false,
    title: '',
    message: '',
    targetStatus: '',
    onConfirm: null
  });

  // Delete & Deactivate Vehicle Flow (Item 1)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState(1); // 1 = choice (Deactivate vs Delete), 2 = hard delete plate confirmation
  const [typedPlateConfirmation, setTypedPlateConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Uploading status
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Forms for inner tabs
  const [expenseForm, setExpenseForm] = useState({
    category: 'Peças',
    description: '',
    date: new Date().toISOString().split('T')[0],
    cost: '',
    km: '',
    notes: '',
    receipt_url: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    type: 'Troca de óleo',
    status: 'in_progress', // 'scheduled' | 'in_progress' | 'completed' | 'canceled'
    problem: '',
    service: '',
    workshop: '',
    entry_date: new Date().toISOString().split('T')[0],
    exit_date: '',
    km: '',
    cost: '',
    parts: '',
    notes: '',
    receipt_url: ''
  });

  const [documentForm, setDocumentForm] = useState({
    name: '',
    doc_type: 'CRLV',
    issue_date: '',
    expiration_date: '',
    file_url: '',
    notes: ''
  });

  const [reminderForm, setReminderForm] = useState({
    title: '',
    category: 'Troca de óleo',
    trigger_type: 'km', // 'km' | 'date' | 'both'
    trigger_km: '',
    trigger_date: '',
    notes: '',
    status: 'pending'
  });

  // Filters for Expenses Tab
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [expenseMonthFilter, setExpenseMonthFilter] = useState('all');
  const [expenseYearFilter, setExpenseYearFilter] = useState('all');

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const loadVehicleData = async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const res = await vehicleService.get(vehicleId);
      setData(res.data);
    } catch (err) {
      console.error('Erro ao carregar dados do veículo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicleData();
  }, [vehicleId]);

  const vehicle = data?.vehicle;
  const stats = data?.stats || {};
  const fuelings = data?.fuelings || [];
  const documents = data?.documents || [];
  const maintenances = data?.maintenances || [];
  const expenses = data?.expenses || [];
  const reminders = data?.reminders || [];

  // Enriched document expiration status
  const enrichedDocuments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return documents.map((doc) => {
      let statusLabel = 'Válido';
      let statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

      if (doc.expiration_date) {
        if (doc.expiration_date < today) {
          statusLabel = 'Vencido';
          statusColor = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
        } else {
          const expDate = new Date(doc.expiration_date);
          const now = new Date();
          const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) {
            statusLabel = 'Vence em breve';
            statusColor = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
          }
        }
      }
      return { ...doc, statusLabel, statusColor };
    });
  }, [documents]);

  // Expenses Total Calculation & Filtering
  const totalExpensesCost = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + Number(curr.cost || 0), 0);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (expenseCategoryFilter !== 'all' && exp.category !== expenseCategoryFilter) return false;
      if (exp.date) {
        const [year, month] = exp.date.split('-');
        if (expenseYearFilter !== 'all' && year !== expenseYearFilter) return false;
        if (expenseMonthFilter !== 'all' && month !== expenseMonthFilter) return false;
      }
      return true;
    });
  }, [expenses, expenseCategoryFilter, expenseMonthFilter, expenseYearFilter]);

  const filteredExpensesTotal = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + Number(curr.cost || 0), 0);
  }, [filteredExpenses]);

  // Available Years for Filter
  const availableYears = useMemo(() => {
    const set = new Set();
    expenses.forEach((e) => {
      if (e.date) {
        const y = e.date.split('-')[0];
        if (y) set.add(y);
      }
    });
    return Array.from(set).sort().reverse();
  }, [expenses]);

  // Pending Reminders Count
  const pendingRemindersCount = useMemo(() => {
    return reminders.filter((r) => r.status === 'pending').length;
  }, [reminders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
        <p className="text-white font-bold">Veículo não encontrado.</p>
        <button onClick={onBack} className="text-xs text-emerald-400 font-bold hover:underline cursor-pointer">
          Voltar para a lista de veículos
        </button>
      </div>
    );
  }

  const statusInfo = getStatusBadge(vehicle.status);
  const hasOdometer = vehicle.odometer_working === 1;

  // File Upload Handler for R2
  const handleFileUpload = async (e, targetForm) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError('');
    try {
      const res = await uploadService.uploadFile(file);
      const url = res.data?.url;
      if (url) {
        if (targetForm === 'document') {
          setDocumentForm((prev) => ({ ...prev, file_url: url }));
        } else if (targetForm === 'maintenance') {
          setMaintenanceForm((prev) => ({ ...prev, receipt_url: url }));
        } else if (targetForm === 'expense') {
          setExpenseForm((prev) => ({ ...prev, receipt_url: url }));
        }
      }
    } catch (err) {
      console.error(err);
      setUploadError('Erro ao fazer upload do arquivo.');
    } finally {
      setUploadingFile(false);
    }
  };

  // 1. Add Document Handler
  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!documentForm.name.trim()) {
      alert('Informe o nome do documento.');
      return;
    }
    if (!documentForm.file_url) {
      alert('Selecione ou faça upload do arquivo ou foto do documento.');
      return;
    }

    try {
      await documentService.create({
        ...documentForm,
        vehicle_id: vehicle.id
      });
      setNewDocumentOpen(false);
      setDocumentForm({
        name: '',
        doc_type: 'CRLV',
        issue_date: '',
        expiration_date: '',
        file_url: '',
        notes: ''
      });
      loadVehicleData();
    } catch (err) {
      alert('Erro ao anexar documento.');
    }
  };

  // 2. Add Maintenance Handler with Vehicle Status Integration Confirmation (Section 4)
  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    if (!maintenanceForm.problem.trim()) {
      alert('Informe o problema ou descrição da manutenção.');
      return;
    }

    try {
      await maintenanceService.create({
        ...maintenanceForm,
        vehicle_id: vehicle.id
      });
      setNewMaintenanceOpen(false);

      // Check Status Integration prompts
      if (maintenanceForm.status === 'in_progress' && vehicle.status !== 'maintenance') {
        setStatusPromptModal({
          open: true,
          title: 'Atualizar Situação do Veículo',
          message: 'Você deseja colocar este veículo como "Em manutenção"?',
          targetStatus: 'maintenance',
          onConfirm: async () => {
            await vehicleService.updateStatus(vehicle.id, {
              status: 'maintenance',
              status_reason: maintenanceForm.problem,
              status_workshop: maintenanceForm.workshop || 'Oficina'
            });
            await refreshCart();
            loadVehicleData();
          }
        });
      } else if (maintenanceForm.status === 'completed' && vehicle.status === 'maintenance') {
        setStatusPromptModal({
          open: true,
          title: 'Atualizar Situação do Veículo',
          message: 'Deseja marcar o veículo como "Funcionando"?',
          targetStatus: 'working',
          onConfirm: async () => {
            await vehicleService.updateStatus(vehicle.id, {
              status: 'working'
            });
            await refreshCart();
            loadVehicleData();
          }
        });
      }

      setMaintenanceForm({
        type: 'Troca de óleo',
        status: 'in_progress',
        problem: '',
        service: '',
        workshop: '',
        entry_date: new Date().toISOString().split('T')[0],
        exit_date: '',
        km: '',
        cost: '',
        parts: '',
        notes: '',
        receipt_url: ''
      });
      loadVehicleData();
    } catch (err) {
      alert('Erro ao registrar manutenção.');
    }
  };

  // 3. Add Expense Handler (Section 5)
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.description.trim() || !expenseForm.cost) {
      alert('Informe a descrição e o valor da despesa.');
      return;
    }

    try {
      await expenseService.create({
        ...expenseForm,
        vehicle_id: vehicle.id
      });
      setNewExpenseOpen(false);
      setExpenseForm({
        category: 'Peças',
        description: '',
        date: new Date().toISOString().split('T')[0],
        cost: '',
        km: '',
        notes: '',
        receipt_url: ''
      });
      loadVehicleData();
    } catch (err) {
      alert('Erro ao registrar despesa.');
    }
  };

  // 4. Add Reminder Handler (Section 6)
  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!reminderForm.title.trim()) {
      alert('Informe o título do lembrete.');
      return;
    }

    try {
      await reminderService.create({
        vehicle_id: vehicle.id,
        title: reminderForm.title,
        category: reminderForm.category,
        trigger_date: reminderForm.trigger_type !== 'km' ? reminderForm.trigger_date || null : null,
        trigger_km: reminderForm.trigger_type !== 'date' ? reminderForm.trigger_km || null : null,
        notes: reminderForm.notes
      });
      setNewReminderOpen(false);
      setReminderForm({
        title: '',
        category: 'Troca de óleo',
        trigger_type: 'km',
        trigger_km: '',
        trigger_date: '',
        notes: '',
        status: 'pending'
      });
      loadVehicleData();
    } catch (err) {
      alert('Erro ao cadastrar lembrete.');
    }
  };

  // Toggle Reminder Status
  const handleToggleReminderStatus = async (reminder) => {
    const nextStatus = reminder.status === 'completed' ? 'pending' : 'completed';
    try {
      await reminderService.updateStatus(reminder.id, { status: nextStatus });
      loadVehicleData();
    } catch (err) {
      alert('Erro ao atualizar status do lembrete.');
    }
  };

  // Generic Item Deletion
  const handleDeleteItem = async () => {
    if (!deleteItemConfirm.id || !deleteItemConfirm.type) return;
    try {
      if (deleteItemConfirm.type === 'document') {
        await documentService.delete(deleteItemConfirm.id);
      } else if (deleteItemConfirm.type === 'maintenance') {
        await maintenanceService.delete(deleteItemConfirm.id);
      } else if (deleteItemConfirm.type === 'expense') {
        await expenseService.delete(deleteItemConfirm.id);
      } else if (deleteItemConfirm.type === 'reminder') {
        await reminderService.delete(deleteItemConfirm.id);
      }
      setDeleteItemConfirm({ open: false, type: null, id: null, title: '' });
      loadVehicleData();
    } catch (err) {
      alert('Erro ao excluir item.');
    }
  };

  // Deactivate Vehicle Action
  const handleDeactivate = async () => {
    setDeleting(true);
    try {
      await vehicleService.updateStatus(vehicle.id, {
        status: 'inactive',
        status_reason: 'Veículo desativado pelo usuário',
        justification: 'Desativação manual mantendo o histórico de abastecimentos e manutenções.'
      });
      setDeleteModalOpen(false);
      await refreshCart();
      loadVehicleData();
      alert(`O veículo ${vehicle.name} foi desativado com sucesso. Todo o histórico foi preservado.`);
    } catch (err) {
      alert('Erro ao desativar veículo.');
    } finally {
      setDeleting(false);
    }
  };

  // Hard Delete Permanently Action
  const handleHardDelete = async () => {
    if (typedPlateConfirmation.trim().toUpperCase() !== vehicle.plate.trim().toUpperCase()) {
      alert(`Para confirmar a exclusão definitiva, digite a placa exatamente como cadastrada: ${vehicle.plate}`);
      return;
    }

    setDeleting(true);
    try {
      await vehicleService.delete(vehicle.id);
      setDeleteModalOpen(false);
      await refreshCart();
      alert(`Veículo ${vehicle.name} (${vehicle.plate}) apagado definitivamente com sucesso.`);
      if (onBack) onBack();
    } catch (err) {
      alert('Erro ao apagar veículo.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Veículos
        </button>
      </div>

      {/* Main Vehicle Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
        
        {/* Vehicle Top Identity */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center shadow-lg">
              {vehicle.photo_url ? (
                <img src={vehicle.photo_url} alt={vehicle.name} className="w-full h-full object-cover" />
              ) : (
                <Truck className="w-10 h-10 text-slate-500" />
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                  <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                  {statusInfo.label}
                </span>

                <button
                  type="button"
                  onClick={() => setStatusModalOpen(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-2 cursor-pointer"
                >
                  Alterar Situação
                </button>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                {vehicle.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="font-mono bg-white text-slate-900 px-2 py-0.5 rounded font-black border border-slate-300 shadow-sm">
                  {vehicle.plate}
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded font-medium">
                  {vehicle.brand} {vehicle.model}
                </span>
                <span className="bg-slate-800/70 px-2 py-0.5 rounded font-medium text-slate-400">
                  Tanque ~{vehicle.tank_capacity || 80}L • {vehicle.fuel_type_default}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. SEÇÃO DE AÇÕES (Section 31) */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Ações do Veículo
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setFuelModalOpen(true)}
              className="min-h-[48px] py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Fuel className="w-4 h-4 stroke-[2.5]" />
              Registrar Abastecimento
            </button>

            <button
              type="button"
              onClick={() => setStatusModalOpen(true)}
              className="min-h-[48px] py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors active:scale-[0.98] cursor-pointer"
            >
              <Clock className="w-4 h-4 text-emerald-400" />
              Alterar Status
            </button>

            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="min-h-[48px] py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors active:scale-[0.98] cursor-pointer"
            >
              <Edit className="w-4 h-4 text-blue-400" />
              Editar Veículo
            </button>
          </div>
        </div>

        {/* 2. SEÇÃO DE GESTÃO: OS 4 MÓDULOS EM GRID 2X2 RESPONSIVO (Sections 1, 30, 31) */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Gestão Integrada ({vehicle.name})
          </span>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Card 1: Documentos & Anexos */}
            <button
              type="button"
              onClick={() => setActiveProfileTab('documents')}
              className={`min-h-[58px] p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                activeTab === 'documents'
                  ? 'bg-emerald-950/30 border-emerald-500/50 ring-2 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850/60'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Documentos
                </span>
                <span className="text-xs font-bold bg-slate-800 px-2 py-0.5 rounded-full text-white">
                  {documents.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-semibold">
                {documents.length === 1 ? '1 arquivo anexado' : `${documents.length} arquivos anexados`}
              </p>
            </button>

            {/* Card 2: Manutenções */}
            <button
              type="button"
              onClick={() => setActiveProfileTab('maintenance')}
              className={`min-h-[58px] p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                activeTab === 'maintenance'
                  ? 'bg-amber-950/30 border-amber-500/50 ring-2 ring-amber-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850/60'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-400" /> Manutenções
                </span>
                <span className="text-xs font-bold bg-slate-800 px-2 py-0.5 rounded-full text-white">
                  {maintenances.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-semibold">
                {maintenances.length === 1 ? '1 registro histórico' : `${maintenances.length} registros no total`}
              </p>
            </button>

            {/* Card 3: Despesas */}
            <button
              type="button"
              onClick={() => setActiveProfileTab('expenses')}
              className={`min-h-[58px] p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                activeTab === 'expenses'
                  ? 'bg-blue-950/30 border-blue-500/50 ring-2 ring-blue-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850/60'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-blue-400" /> Despesas
                </span>
                <span className="text-xs font-bold bg-slate-800 px-2 py-0.5 rounded-full text-white">
                  {expenses.length}
                </span>
              </div>
              <p className="text-xs text-emerald-400 mt-2 font-bold truncate">
                R$ {totalExpensesCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </button>

            {/* Card 4: Lembretes */}
            <button
              type="button"
              onClick={() => setActiveProfileTab('reminders')}
              className={`min-h-[58px] p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                activeTab === 'reminders'
                  ? 'bg-purple-950/30 border-purple-500/50 ring-2 ring-purple-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850/60'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-400" /> Lembretes
                </span>
                <span className="text-xs font-bold bg-slate-800 px-2 py-0.5 rounded-full text-white">
                  {pendingRemindersCount}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-semibold">
                {pendingRemindersCount === 1 ? '1 lembrete pendente' : `${pendingRemindersCount} lembretes pendentes`}
              </p>
            </button>
          </div>
        </div>

        {/* Aggregated KPI Cards for Vehicle */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Última KM Registrada</span>
            <p className="text-base sm:text-lg font-black text-white mt-0.5">
              {hasOdometer ? (stats.current_km ? `${Number(stats.current_km).toLocaleString('pt-BR')} km` : 'Sem registros') : 'Odômetro Não Funcional'}
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Média de Consumo</span>
            <p className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
              {hasOdometer && stats.avg_consumption_kml ? `${stats.avg_consumption_kml} km/L` : <span className="text-slate-500 italic text-xs">Não calculado</span>}
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Abastecimentos</span>
            <p className="text-base sm:text-lg font-black text-white mt-0.5">
              {stats.total_fuelings || 0} ({stats.total_liters || 0} L)
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Total Combustível Gasto</span>
            <p className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
              R$ {Number(stats.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'fuelings', label: `Abastecimentos (${fuelings.length})`, icon: Fuel },
          { id: 'documents', label: `Documentos (${documents.length})`, icon: ShieldCheck },
          { id: 'maintenance', label: `Manutenções (${maintenances.length})`, icon: Wrench },
          { id: 'expenses', label: `Despesas (${expenses.length})`, icon: DollarSign },
          { id: 'reminders', label: `Lembretes (${pendingRemindersCount})`, icon: Clock },
          { id: 'details', label: 'Ficha Cadastral', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveProfileTab(tab.id)}
              className={`min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HISTÓRICO DE ABASTECIMENTOS */}
      {/* ========================================================================= */}
      {activeTab === 'fuelings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-400" />
              Histórico de Abastecimentos ({fuelings.length})
            </h3>
            <button
              type="button"
              onClick={() => setFuelModalOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Abastecimento
            </button>
          </div>

          {fuelings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {fuelings.map((f) => (
                <div
                  key={f.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3 hover:border-slate-700 transition-colors shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      {f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : 'Data não informada'}
                    </span>
                    {f.session_code && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                        Sessão: {f.session_code}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Litros</span>
                      <strong className="text-white">{f.liters} L</strong>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Valor</span>
                      <strong className="text-emerald-400">R$ {Number(f.total_cost).toFixed(2)}</strong>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">KM Rodados</span>
                      <strong className="text-blue-400">{f.km_driven ? `${f.km_driven} km` : '-'}</strong>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Consumo</span>
                      <strong className="text-emerald-300">{f.consumption_kml ? `${f.consumption_kml} km/L` : '-'}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>Combustível: {f.fuel_type} • Posto: {f.fuel_station || '-'}</span>
                    <div className="flex items-center gap-2">
                      {f.photo_pump_url && (
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoZoom(f.photo_pump_url)}
                          className="text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" /> Bomba
                        </button>
                      )}
                      {f.photo_dashboard_url && (
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoZoom(f.photo_dashboard_url)}
                          className="text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" /> Painel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-xs text-slate-500">
              Nenhum abastecimento registrado para este veículo.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DOCUMENTOS & ANEXOS (Section 2) */}
      {/* ========================================================================= */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Documentos & Anexos ({documents.length})
              </h3>
              <p className="text-xs text-slate-400">CRLV, Licenciamento, Seguro, Notas Fiscais e Comprovantes.</p>
            </div>

            <button
              type="button"
              onClick={() => setNewDocumentOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Adicionar documento
            </button>
          </div>

          {enrichedDocuments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {enrichedDocuments.map((doc) => (
                <div key={doc.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 shadow-md flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          {doc.doc_type}
                        </span>
                        <h4 className="font-bold text-sm text-white truncate">{doc.name}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${doc.statusColor}`}>
                        {doc.statusLabel}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-850">
                      {doc.issue_date && (
                        <div className="flex justify-between">
                          <span>Emissão:</span>
                          <strong className="text-slate-200">{doc.issue_date.split('-').reverse().join('/')}</strong>
                        </div>
                      )}
                      {doc.expiration_date && (
                        <div className="flex justify-between">
                          <span>Vencimento:</span>
                          <strong className="text-slate-200">{doc.expiration_date.split('-').reverse().join('/')}</strong>
                        </div>
                      )}
                      {doc.notes && (
                        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                          {doc.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Document Actions: Visualizar, Baixar, Excluir */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewDocModal({ open: true, doc })}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Visualizar
                      </button>
                      <a
                        href={doc.file_url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-300 hover:text-white inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteItemConfirm({
                        open: true,
                        type: 'document',
                        id: doc.id,
                        title: doc.name
                      })}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                      title="Excluir documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
              <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Nenhum documento anexado para este veículo.</p>
              <button
                type="button"
                onClick={() => setNewDocumentOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Anexar primeiro documento
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MANUTENÇÕES (Sections 3 & 4) */}
      {/* ========================================================================= */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                Histórico de Manutenções ({maintenances.length})
              </h3>
              <p className="text-xs text-slate-400">Preventivas, corretivas, revisões e controle de oficinas.</p>
            </div>

            <button
              type="button"
              onClick={() => setNewMaintenanceOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Registrar manutenção
            </button>
          </div>

          {maintenances.length > 0 ? (
            <div className="space-y-3">
              {maintenances.map((m) => {
                const isCompleted = m.status === 'completed' || (m.exit_date && m.status !== 'in_progress');
                const isInProgress = m.status === 'in_progress' || (!m.exit_date && m.status !== 'completed' && m.status !== 'canceled');
                const isScheduled = m.status === 'scheduled';
                const isCanceled = m.status === 'canceled';

                const statusLabel = isCompleted ? 'Concluída' : isInProgress ? 'Em andamento' : isScheduled ? 'Agendada' : 'Cancelada';
                const statusBadgeClass = isCompleted
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : isInProgress
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                  : isScheduled
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-slate-700/20 text-slate-400 border-slate-700/40';

                return (
                  <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400">{m.type}</span>
                          <h4 className="font-bold text-sm text-white">{m.problem}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusBadgeClass}`}>
                          {statusLabel}
                        </span>
                        <strong className="text-sm font-black text-emerald-400">
                          R$ {Number(m.cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                      <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
                        <span className="text-[10px] text-slate-500 block">Oficina / Local</span>
                        <strong className="text-white">{m.workshop || 'Interna'}</strong>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
                        <span className="text-[10px] text-slate-500 block">Datas</span>
                        <span className="text-white">
                          Entrada: <strong>{m.entry_date ? m.entry_date.split('-').reverse().join('/') : '-'}</strong>
                          {m.exit_date && ` • Saída: ${m.exit_date.split('-').reverse().join('/')}`}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
                        <span className="text-[10px] text-slate-500 block">KM no Serviço</span>
                        <strong className="text-white">{m.km ? `${Number(m.km).toLocaleString('pt-BR')} km` : 'Não informada'}</strong>
                      </div>
                    </div>

                    {m.service && (
                      <p className="text-xs text-slate-300">
                        <strong className="text-slate-400">Serviço Realizado:</strong> {m.service}
                      </p>
                    )}

                    {m.parts && (
                      <p className="text-xs text-slate-300">
                        <strong className="text-slate-400">Peças Trocadas:</strong> {m.parts}
                      </p>
                    )}

                    {m.notes && (
                      <p className="text-xs text-slate-400 italic">
                        Observação: {m.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                      <div>
                        {m.receipt_url && (
                          <button
                            type="button"
                            onClick={() => setSelectedPhotoZoom(m.receipt_url)}
                            className="text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer font-semibold"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Ver Comprovante / Foto
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteItemConfirm({
                          open: true,
                          type: 'maintenance',
                          id: m.id,
                          title: `Manutenção: ${m.problem}`
                        })}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                        title="Excluir manutenção"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
              <Wrench className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Nenhum registro de manutenção para este veículo.</p>
              <button
                type="button"
                onClick={() => setNewMaintenanceOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Registrar primeira manutenção
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DESPESAS (Section 5) */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          
          {/* Header Banner com Total das Despesas */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block mb-1">
                Total de Despesas do Veículo
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-400">
                R$ {totalExpensesCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Peças, oficina, pneus, bateria, IPVA, multas e licenciamento (combustível controlado em abastecimento).
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNewExpenseOpen(true)}
              className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Registrar despesa
            </button>
          </div>

          {/* Filtros de Despesas: Mês, Ano, Categoria */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-emerald-400" /> Filtrar:
              </span>

              {/* Categoria */}
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none"
              >
                <option value="all">Todas as Categorias</option>
                {['Peças', 'Oficina', 'Pneus', 'Óleo', 'Bateria', 'Multa', 'IPVA', 'Licenciamento', 'Seguro', 'Lavagem', 'Outros'].map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Ano */}
              <select
                value={expenseYearFilter}
                onChange={(e) => setExpenseYearFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none"
              >
                <option value="all">Todos os Anos</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {/* Mês */}
              <select
                value={expenseMonthFilter}
                onChange={(e) => setExpenseMonthFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none"
              >
                <option value="all">Todos os Meses</option>
                {[
                  { id: '01', label: 'Janeiro' }, { id: '02', label: 'Fevereiro' }, { id: '03', label: 'Março' },
                  { id: '04', label: 'Abril' }, { id: '05', label: 'Maio' }, { id: '06', label: 'Junho' },
                  { id: '07', label: 'Julho' }, { id: '08', label: 'Agosto' }, { id: '09', label: 'Setembro' },
                  { id: '10', label: 'Outubro' }, { id: '11', label: 'Novembro' }, { id: '12', label: 'Dezembro' }
                ].map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>

              {(expenseCategoryFilter !== 'all' || expenseMonthFilter !== 'all' || expenseYearFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setExpenseCategoryFilter('all');
                    setExpenseMonthFilter('all');
                    setExpenseYearFilter('all');
                  }}
                  className="text-rose-400 hover:text-rose-300 font-bold ml-1 cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400">Total filtrado: </span>
              <strong className="text-emerald-400 font-bold">
                R$ {filteredExpensesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {filteredExpenses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredExpenses.map((exp) => (
                <div key={exp.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-2.5 shadow-md flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                        {exp.category}
                      </span>
                      <strong className="text-sm font-black text-emerald-400">
                        R$ {Number(exp.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <h4 className="font-bold text-sm text-white">{exp.description}</h4>

                    <div className="text-xs text-slate-400 space-y-0.5">
                      <p>Data: <strong className="text-slate-200">{exp.date ? exp.date.split('-').reverse().join('/') : '-'}</strong></p>
                      {exp.km && <p>KM: <strong className="text-slate-200">{Number(exp.km).toLocaleString('pt-BR')} km</strong></p>}
                      {exp.notes && <p className="text-[11px] text-slate-400 italic pt-1">{exp.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      {exp.receipt_url && (
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoZoom(exp.receipt_url)}
                          className="text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" /> Comprovante
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteItemConfirm({
                        open: true,
                        type: 'expense',
                        id: exp.id,
                        title: `Despesa: ${exp.description}`
                      })}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                      title="Excluir despesa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
              <DollarSign className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Nenhuma despesa encontrada para os filtros selecionados.</p>
              <button
                type="button"
                onClick={() => setNewExpenseOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Registrar nova despesa
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LEMBRETES (Section 6) */}
      {/* ========================================================================= */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Lembretes Preventivos por Data ou Quilometragem ({reminders.length})
              </h3>
              <p className="text-xs text-slate-400">Avisos automáticos de troca de óleo, revisão e vencimentos.</p>
            </div>

            <button
              type="button"
              onClick={() => setNewReminderOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Novo lembrete
            </button>
          </div>

          {reminders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {reminders.map((r) => {
                const isCompleted = r.status === 'completed';
                const currentKm = vehicle.last_km || stats.current_km || 0;
                const isNearKm = r.trigger_km && currentKm && (r.trigger_km - currentKm <= 1000 && r.trigger_km >= currentKm);
                const isOverdueKm = r.trigger_km && currentKm && (currentKm >= r.trigger_km);

                const today = new Date().toISOString().split('T')[0];
                const isOverdueDate = r.trigger_date && r.trigger_date < today;

                let alertBadge = null;
                if (isCompleted) {
                  alertBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Concluído</span>;
                } else if (isOverdueKm || isOverdueDate) {
                  alertBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40 animate-pulse">Vencido</span>;
                } else if (isNearKm) {
                  alertBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40">Próximo</span>;
                } else {
                  alertBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">Pendente</span>;
                }

                return (
                  <div
                    key={r.id}
                    className={`bg-slate-900 border rounded-2xl p-4.5 space-y-3 shadow-md flex flex-col justify-between ${
                      isCompleted ? 'border-slate-800/60 opacity-60' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] uppercase font-bold text-purple-400 block">{r.category}</span>
                          <h4 className={`font-bold text-sm text-white ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                            {r.title}
                          </h4>
                        </div>
                        {alertBadge}
                      </div>

                      <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                        {r.trigger_km && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Gatilho KM:</span>
                            <strong className="text-white">{Number(r.trigger_km).toLocaleString('pt-BR')} km</strong>
                          </div>
                        )}
                        {r.trigger_date && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Gatilho Data:</span>
                            <strong className="text-white">{r.trigger_date.split('-').reverse().join('/')}</strong>
                          </div>
                        )}
                        {r.notes && (
                          <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                            {r.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleReminderStatus(r)}
                        className={`inline-flex items-center gap-1.5 font-bold cursor-pointer ${
                          isCompleted ? 'text-slate-400 hover:text-white' : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <Square className="w-4 h-4" /> Reabrir lembrete
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-4 h-4" /> Marcar concluído
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteItemConfirm({
                          open: true,
                          type: 'reminder',
                          id: r.id,
                          title: `Lembrete: ${r.title}`
                        })}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                        title="Excluir lembrete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Nenhum lembrete cadastrado para este veículo.</p>
              <button
                type="button"
                onClick={() => setNewReminderOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Criar primeiro lembrete
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: FICHA CADASTRAL & CONFIGURAÇÕES */}
      {/* ========================================================================= */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">RENAVAM</span>
                <strong className="text-white text-sm font-mono">{vehicle.renavam || 'Não informado'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Chassi</span>
                <strong className="text-white text-sm font-mono">{vehicle.chassi || 'Não informado'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Número CRLV</span>
                <strong className="text-white text-sm font-mono">{vehicle.crlv_number || 'Não informado'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 sm:col-span-2">
                <span className="text-slate-400 block mb-1">Proprietário</span>
                <strong className="text-white text-sm">{vehicle.owner_name || 'GCS Logística'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">CPF / CNPJ</span>
                <strong className="text-white text-sm">{vehicle.owner_doc || '-'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Município / UF</span>
                <strong className="text-white text-sm">{vehicle.city || 'São Paulo'} - {vehicle.uf || 'SP'}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Licenciamento / Exercício</span>
                <strong className="text-white text-sm">{vehicle.license_year || 2026}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Odômetro</span>
                <strong className={hasOdometer ? 'text-emerald-400 text-sm' : 'text-amber-400 text-sm'}>
                  {hasOdometer ? 'Funcional ✅' : 'Não Funcional ❌'}
                </strong>
              </div>
            </div>

            {vehicle.notes && (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                <span className="font-bold text-slate-300 block mb-1">Observações Gerais:</span>
                <p className="text-slate-400">{vehicle.notes}</p>
              </div>
            )}
          </div>

          {/* Área de Gerenciamento & Exclusão Protegida (Item 1) */}
          <div className="bg-slate-900 border border-rose-900/30 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Gerenciamento e Exclusão do Veículo</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Você pode desativar este veículo para retirá-lo das operações ativas mantendo todo o histórico de abastecimentos e manutenções, ou apagá-lo definitivamente do banco de dados.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmStep(1);
                  setTypedPlateConfirmation('');
                  setDeleteModalOpen(true);
                }}
                className="py-3 px-5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-2 transition-colors active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> 🗑️ Apagar veículo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADICIONAR DOCUMENTO (Section 2) */}
      {/* ========================================================================= */}
      {newDocumentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Adicionar Documento / Anexo
              </h3>
              <button
                type="button"
                onClick={() => setNewDocumentOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Tipo do Documento *</label>
                  <select
                    value={documentForm.doc_type}
                    onChange={(e) => setDocumentForm({ ...documentForm, doc_type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  >
                    <option value="CRLV">CRLV</option>
                    <option value="Licenciamento">Licenciamento</option>
                    <option value="Seguro">Seguro</option>
                    <option value="Nota fiscal">Nota fiscal</option>
                    <option value="Comprovante">Comprovante</option>
                    <option value="Documento geral">Documento geral</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Nome / Título *</label>
                  <input
                    type="text"
                    placeholder="Ex: CRLV 2026 Digital"
                    value={documentForm.name}
                    onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Data de Emissão</label>
                  <input
                    type="date"
                    value={documentForm.issue_date}
                    onChange={(e) => setDocumentForm({ ...documentForm, issue_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Data de Vencimento (se houver)</label>
                  <input
                    type="date"
                    value={documentForm.expiration_date}
                    onChange={(e) => setDocumentForm({ ...documentForm, expiration_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais sobre o documento..."
                  value={documentForm.notes}
                  onChange={(e) => setDocumentForm({ ...documentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>

              {/* Upload de Arquivo / Foto do Celular */}
              <div className="space-y-2 pt-1">
                <label className="block text-slate-300 font-semibold">Arquivo / Foto do Documento *</label>
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, 'document')}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileUpload(e, 'document')}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="min-h-[48px] py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" /> Tirar Foto
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="min-h-[48px] py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-blue-400" /> Escolher Arquivo / PDF
                  </button>
                </div>

                {uploadingFile && (
                  <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" /> Enviando arquivo para o Cloudflare R2...
                  </p>
                )}

                {documentForm.file_url && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
                    <span className="truncate">Arquivo anexado com sucesso</span>
                    <button
                      type="button"
                      onClick={() => setDocumentForm((p) => ({ ...p, file_url: '' }))}
                      className="text-rose-400 hover:underline font-bold ml-2 cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewDocumentOpen(false)}
                  className="py-3 rounded-xl bg-slate-800 text-slate-400 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile || !documentForm.file_url}
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/50"
                >
                  Salvar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTRAR MANUTENÇÃO (Sections 3 & 4) */}
      {/* ========================================================================= */}
      {newMaintenanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                Registrar Manutenção
              </h3>
              <button
                type="button"
                onClick={() => setNewMaintenanceOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMaintenance} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Tipo de Manutenção *</label>
                  <select
                    value={maintenanceForm.type}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  >
                    <option value="Troca de óleo">Troca de óleo</option>
                    <option value="Freios">Freios</option>
                    <option value="Pneus">Pneus</option>
                    <option value="Motor">Motor</option>
                    <option value="Suspensão">Suspensão</option>
                    <option value="Elétrica">Elétrica</option>
                    <option value="Revisão">Revisão</option>
                    <option value="Bateria">Bateria</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Status da Manutenção *</label>
                  <select
                    value={maintenanceForm.status}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500 font-bold text-emerald-400"
                  >
                    <option value="in_progress">🟡 Em andamento</option>
                    <option value="scheduled">🔵 Agendada</option>
                    <option value="completed">🟢 Concluída</option>
                    <option value="canceled">⚪ Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Problema Identificado *</label>
                <input
                  type="text"
                  placeholder="Ex: Barulho na suspensão dianteira"
                  value={maintenanceForm.problem}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, problem: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Serviço Realizado</label>
                  <input
                    type="text"
                    placeholder="Ex: Troca de amortecedores e buchas"
                    value={maintenanceForm.service}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, service: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Oficina / Mecânico</label>
                  <input
                    type="text"
                    placeholder="Ex: Auto Mecânica Central"
                    value={maintenanceForm.workshop}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, workshop: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Data Entrada *</label>
                  <input
                    type="date"
                    value={maintenanceForm.entry_date}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, entry_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Data Saída (se concluída)</label>
                  <input
                    type="date"
                    value={maintenanceForm.exit_date}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, exit_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">KM Atual (opcional)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 232941"
                    value={maintenanceForm.km}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, km: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={maintenanceForm.cost}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Peças Trocadas</label>
                  <input
                    type="text"
                    placeholder="Ex: 2 Amortecedores Cofap"
                    value={maintenanceForm.parts}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, parts: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Garantia, notas fiscais, detalhes..."
                  value={maintenanceForm.notes}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>

              {/* Upload Comprovante / Foto */}
              <div className="space-y-2 pt-1">
                <label className="block text-slate-300 font-semibold">Comprovante / Foto da Manutenção (opcional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, 'maintenance')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                </div>
                {uploadingFile && <p className="text-xs text-emerald-400 animate-pulse">Enviando comprovante...</p>}
                {maintenanceForm.receipt_url && <p className="text-xs text-emerald-400 font-bold">Comprovante anexado ✅</p>}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewMaintenanceOpen(false)}
                  className="py-3 rounded-xl bg-slate-800 text-slate-400 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-lg shadow-emerald-950/50"
                >
                  Salvar Manutenção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REGISTRAR DESPESA (Section 5) */}
      {/* ========================================================================= */}
      {newExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-400" />
                Registrar Despesa
              </h3>
              <button
                type="button"
                onClick={() => setNewExpenseOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Categoria *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500 font-bold"
                  >
                    {['Peças', 'Oficina', 'Pneus', 'Óleo', 'Bateria', 'Multa', 'IPVA', 'Licenciamento', 'Seguro', 'Lavagem', 'Outros'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseForm.cost}
                    onChange={(e) => setExpenseForm({ ...expenseForm, cost: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500 font-mono font-bold text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Descrição da Despesa *</label>
                <input
                  type="text"
                  placeholder="Ex: Compra de filtro de ar e palhetas"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Data da Despesa *</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Quilometragem (opcional)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 232941"
                    value={expenseForm.km}
                    onChange={(e) => setExpenseForm({ ...expenseForm, km: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Detalhes adicionais..."
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>

              {/* Upload Comprovante / Foto */}
              <div className="space-y-2 pt-1">
                <label className="block text-slate-300 font-semibold">Comprovante / Foto da Nota (opcional)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, 'expense')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                />
                {uploadingFile && <p className="text-xs text-emerald-400 animate-pulse">Enviando comprovante...</p>}
                {expenseForm.receipt_url && <p className="text-xs text-emerald-400 font-bold">Comprovante anexado ✅</p>}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewExpenseOpen(false)}
                  className="py-3 rounded-xl bg-slate-800 text-slate-400 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-lg shadow-emerald-950/50"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CRIAR LEMBRETE (Section 6) */}
      {/* ========================================================================= */}
      {newReminderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Criar Novo Lembrete
              </h3>
              <button
                type="button"
                onClick={() => setNewReminderOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddReminder} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Título do Lembrete *</label>
                <input
                  type="text"
                  placeholder="Ex: Troca de óleo motor 15W40"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Tipo / Categoria *</label>
                <select
                  value={reminderForm.category}
                  onChange={(e) => setReminderForm({ ...reminderForm, category: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                >
                  <option value="Troca de óleo">Troca de óleo</option>
                  <option value="Revisão periódica">Revisão periódica</option>
                  <option value="Pneus e Alinhamento">Pneus e Alinhamento</option>
                  <option value="Freios">Freios</option>
                  <option value="Documentação / Licenciamento">Documentação / Licenciamento</option>
                  <option value="Seguro">Seguro</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              {/* Tipo de Gatilho: DATA ou QUILOMETRAGEM */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-semibold">Gatilho de Aviso (Por Data ou KM) *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'km', label: 'Por KM' },
                    { id: 'date', label: 'Por Data' },
                    { id: 'both', label: 'Ambos' }
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setReminderForm({ ...reminderForm, trigger_type: g.id })}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                        reminderForm.trigger_type === g.id
                          ? 'bg-purple-600/30 border-purple-500 text-purple-300 ring-1 ring-purple-500'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(reminderForm.trigger_type === 'km' || reminderForm.trigger_type === 'both') && (
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Quilometragem Alvo (KM)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="Ex: 250000"
                      value={reminderForm.trigger_km}
                      onChange={(e) => setReminderForm({ ...reminderForm, trigger_km: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold focus:border-emerald-500"
                      required={reminderForm.trigger_type === 'km'}
                    />
                  </div>
                )}

                {(reminderForm.trigger_type === 'date' || reminderForm.trigger_type === 'both') && (
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Data Limite</label>
                    <input
                      type="date"
                      value={reminderForm.trigger_date}
                      onChange={(e) => setReminderForm({ ...reminderForm, trigger_date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                      required={reminderForm.trigger_type === 'date'}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Informações do que precisa ser feito..."
                  value={reminderForm.notes}
                  onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewReminderOpen(false)}
                  className="py-3 rounded-xl bg-slate-800 text-slate-400 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer shadow-lg shadow-purple-950/50"
                >
                  Salvar Lembrete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CONFIRMAÇÃO DE INTEGRAÇÃO DE STATUS (Section 4) */}
      {/* ========================================================================= */}
      {statusPromptModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-white">{statusPromptModal.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {statusPromptModal.message}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusPromptModal({ open: false, title: '', message: '', targetStatus: '', onConfirm: null })}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Não alterar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (statusPromptModal.onConfirm) await statusPromptModal.onConfirm();
                  setStatusPromptModal({ open: false, title: '', message: '', targetStatus: '', onConfirm: null });
                }}
                className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer shadow-lg"
              >
                Sim, alterar status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CONFIRMAÇÃO DE EXCLUSÃO DE ITEM (Document, Maintenance, etc) */}
      {/* ========================================================================= */}
      {deleteItemConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="font-bold text-base text-white">Confirmar Exclusão</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir <strong>{deleteItemConfirm.title}</strong>? Essa ação não pode ser desfeita.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteItemConfirm({ open: false, type: null, id: null, title: '' })}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: PREVIEW DE DOCUMENTO */}
      {/* ========================================================================= */}
      {previewDocModal.open && previewDocModal.doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-3xl max-h-[90vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{previewDocModal.doc.name}</h3>
                <span className="text-xs text-slate-400">{previewDocModal.doc.doc_type}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocModal({ open: false, doc: null })}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-slate-950 flex items-center justify-center p-2 min-h-[300px]">
              {previewDocModal.doc.file_url.endsWith('.pdf') ? (
                <iframe
                  src={previewDocModal.doc.file_url}
                  className="w-full h-[60vh] rounded-xl"
                  title="Visualização do PDF"
                />
              ) : (
                <img
                  src={previewDocModal.doc.file_url}
                  alt={previewDocModal.doc.name}
                  className="max-h-[65vh] object-contain rounded-xl"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <a
                href={previewDocModal.doc.file_url}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-4 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir em Nova Aba
              </a>
              <a
                href={previewDocModal.doc.file_url}
                download
                target="_blank"
                rel="noreferrer"
                className="py-2 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Arquivo
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Other Standalone Modals */}
      <StatusChangeModal
        vehicle={vehicle}
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onUpdated={loadVehicleData}
      />

      <VehicleFormModal
        isOpen={editModalOpen}
        vehicleToEdit={vehicle}
        onClose={() => setEditModalOpen(false)}
        onSaved={loadVehicleData}
      />

      <FuelingModal
        vehicle={vehicle}
        isOpen={fuelModalOpen}
        onClose={() => setFuelModalOpen(false)}
        onNextVehicle={() => {
          setFuelModalOpen(false);
          loadVehicleData();
        }}
        onViewCart={() => {
          setFuelModalOpen(false);
          if (setActiveTab) setActiveTab('cart');
        }}
      />

      {/* Modal para Apagar / Desativar Veículo */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-7 w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Tem certeza que deseja apagar este veículo?
                </h3>
                <p className="text-xs text-rose-300 font-semibold mt-1">
                  “Essa ação poderá apagar também os dados relacionados ao veículo.”
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Nome do Veículo:</span>
                <strong className="text-white">{vehicle.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Placa:</span>
                <strong className="text-emerald-400 font-mono">{vehicle.plate}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ano Fabricação / Modelo:</span>
                <strong className="text-white">{vehicle.year_fab}/{vehicle.year_model}</strong>
              </div>
            </div>

            {confirmStep === 1 ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-300 font-medium">Escolha como deseja proceder:</p>
                
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={deleting}
                    className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition-colors flex items-start gap-3 group cursor-pointer"
                  >
                    <Ban className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 block">
                        🟡 Desativar veículo (Recomendado)
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        O veículo é retirado do abastecimento semanal, mas todo o histórico e relatórios continuam preservados.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmStep(2)}
                    className="p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 text-left transition-colors flex items-start gap-3 group cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-rose-300 group-hover:text-rose-200 block">
                        🔴 Apagar definitivamente
                      </span>
                      <span className="text-[11px] text-rose-300/70 mt-0.5 block">
                        Exclui o registro do veículo e todos os seus vínculos permanentemente do banco de dados.
                      </span>
                    </div>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  ⚠️ <strong>Segunda Confirmação Obrigatória:</strong> Digite a placa <strong>{vehicle.plate}</strong> abaixo para confirmar a exclusão definitiva:
                </div>

                <input
                  type="text"
                  placeholder={`Digite ${vehicle.plate}`}
                  value={typedPlateConfirmation}
                  onChange={(e) => setTypedPlateConfirmation(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-rose-500/50 text-white font-mono font-bold text-center uppercase focus:outline-none"
                />

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmStep(1)}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleHardDelete}
                    disabled={deleting || typedPlateConfirmation.trim() !== vehicle.plate.trim()}
                    className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg disabled:opacity-40 cursor-pointer"
                  >
                    {deleting ? 'Apagando...' : 'Confirmar Exclusão Definitiva'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {selectedPhotoZoom && (
        <div
          onClick={() => setSelectedPhotoZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 cursor-pointer"
        >
          <div className="max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
            <img src={selectedPhotoZoom} alt="Visualização" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
