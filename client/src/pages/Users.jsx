import React, { useState, useEffect, useMemo } from 'react';
import {
  Users as UsersIcon,
  Plus,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Lock,
  Mail,
  User,
  Search,
  Key,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  UserCog,
  RefreshCw,
  Info
} from 'lucide-react';
import { userService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'funcionario'
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'funcionario',
    active: 1
  });

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const showNotification = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, 4500);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.list();
      setUsers(res.data.users || []);
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Erro ao carregar lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Helper to normalize role
  const normalizeRole = (r) => {
    const str = String(r || '').toLowerCase().trim();
    if (str === 'admin' || str === 'gerente') return 'gerente';
    if (str === 'encarregado' || str === 'supervisor') return 'encarregado';
    return 'funcionario';
  };

  // Metrics
  const stats = useMemo(() => {
    const total = users.length;
    const gerentes = users.filter((u) => normalizeRole(u.role) === 'gerente').length;
    const encarregados = users.filter((u) => normalizeRole(u.role) === 'encarregado').length;
    const funcionarios = users.filter((u) => normalizeRole(u.role) === 'funcionario').length;
    const ativos = users.filter((u) => u.active === 1 || u.active === true).length;
    const inativos = total - ativos;
    return { total, gerentes, encarregados, funcionarios, ativos, inativos };
  }, [users]);

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const normRole = normalizeRole(u.role);
      const isActive = u.active === 1 || u.active === true;

      // Text search
      const q = search.toLowerCase().trim();
      const matchText = !q || (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q));

      // Role filter
      const matchRole = roleFilter === 'ALL' || normRole === roleFilter.toLowerCase();

      // Status filter
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && isActive) ||
        (statusFilter === 'INACTIVE' && !isActive);

      return matchText && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Handlers
  const handleOpenCreate = () => {
    setCreateForm({
      name: '',
      email: '',
      password: '',
      role: 'funcionario'
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      showNotification('error', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await userService.create(createForm);
      showNotification('success', res.data.message || 'Usuário cadastrado com sucesso!');
      setCreateModalOpen(false);
      loadUsers();
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Erro ao cadastrar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: normalizeRole(user.role),
      active: user.active === 1 || user.active === true ? 1 : 0
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const res = await userService.update(selectedUser.id, editForm);
      showNotification('success', res.data.message || 'Usuário atualizado com sucesso!');
      setEditModalOpen(false);
      loadUsers();
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Erro ao atualizar dados do usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !(user.active === 1 || user.active === true);
    try {
      const res = await userService.updateStatus(user.id, newStatus);
      showNotification('success', res.data.message || `Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso.`);
      loadUsers();
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Erro ao alterar status do usuário.');
    }
  };

  const handleOpenPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPassword(false);
    setPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword || newPassword.length < 4) {
      showNotification('error', 'A nova senha deve possuir no mínimo 4 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await userService.resetPassword(selectedUser.id, newPassword);
      showNotification('success', res.data.message || 'Senha redefinida com sucesso!');
      setPasswordModalOpen(false);
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (user) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const res = await userService.delete(selectedUser.id);
      showNotification('success', res.data.message || 'Usuário excluído com sucesso.');
      setDeleteModalOpen(false);
      loadUsers();
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Erro ao excluir usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedback.message && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl transition-all animate-in fade-in slide-in-from-top-4 ${
            feedback.type === 'error'
              ? 'bg-rose-950/80 border-rose-600/40 text-rose-200'
              : 'bg-emerald-950/80 border-emerald-600/40 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-sm font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', message: '' })}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Acesso Exclusivo do Gerente
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Gestão de Usuários & Acessos
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl">
            Gerencie os 3 perfis de acesso do sistema: <strong className="text-emerald-400">Gerente</strong> (Acesso Total), <strong className="text-amber-400">Encarregado</strong> (Abastecimentos & Relatórios) e <strong className="text-blue-400">Funcionário</strong> (Abastecimento Simples).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={loadUsers}
            disabled={loading}
            title="Atualizar lista"
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2.5 shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/60 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Novo Usuário
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Usuários</span>
            <UsersIcon className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-1">{stats.ativos} ativos no sistema</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gerentes</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-400">{stats.gerentes}</div>
          <div className="text-[11px] text-emerald-500/80 mt-1">Acesso Total / Dono</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Encarregados</span>
            <UserCog className="w-4 h-4" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-amber-400">{stats.encarregados}</div>
          <div className="text-[11px] text-amber-500/80 mt-1">Abastecimentos & Relatórios</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Funcionários</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-blue-400">{stats.funcionarios}</div>
          <div className="text-[11px] text-blue-500/80 mt-1">Abastecimento Simples</div>
        </div>
      </div>

      {/* Role Explanation Callout */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <p className="text-slate-300">
            <strong className="text-emerald-400">GERENTE:</strong> Acesso total (Dono) |{' '}
            <strong className="text-amber-400">ENCARREGADO:</strong> Registra/Edita abastecimentos, vê histórico e relatórios |{' '}
            <strong className="text-blue-400">FUNCIONÁRIO:</strong> Tela única operacional para abastecer.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 font-semibold shrink-0">Cargo:</span>
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shrink-0">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === 'ALL' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setRoleFilter('GERENTE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === 'GERENTE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gerente
            </button>
            <button
              onClick={() => setRoleFilter('ENCARREGADO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === 'ENCARREGADO' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Encarregado
            </button>
            <button
              onClick={() => setRoleFilter('FUNCIONARIO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === 'FUNCIONARIO' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Funcionário
            </button>
          </div>

          <span className="text-xs text-slate-400 font-semibold shrink-0 ml-2">Status:</span>
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shrink-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'INACTIVE' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Inativos
            </button>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Carregando lista de usuários...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
          <UserCog className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Nenhum usuário encontrado</h3>
          <p className="text-xs text-slate-400 mb-4">Tente ajustar os filtros de busca acima.</p>
          <button
            onClick={() => {
              setSearch('');
              setRoleFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const roleNorm = normalizeRole(u.role);
            const isTargetGerente = roleNorm === 'gerente';
            const isTargetEncarregado = roleNorm === 'encarregado';
            const isActive = u.active === 1 || u.active === true;
            const isSelf = String(currentUser?.id) === String(u.id);

            return (
              <div
                key={u.id}
                className={`bg-slate-900 border rounded-3xl p-5 space-y-4 shadow-lg transition-all hover:border-slate-700 flex flex-col justify-between ${
                  !isActive
                    ? 'border-slate-800/60 opacity-75'
                    : isTargetGerente
                    ? 'border-emerald-500/30 bg-gradient-to-b from-slate-900 to-slate-900/90'
                    : isTargetEncarregado
                    ? 'border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-900/90'
                    : 'border-slate-800'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${
                        isTargetGerente
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : isTargetEncarregado
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      }`}
                    >
                      {u.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-white text-sm truncate" title={u.name}>
                          {u.name}
                        </h3>
                        {isSelf && (
                          <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-1.5 py-0.2 rounded border border-slate-700 shrink-0">
                            Você
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5" title={u.email}>
                        <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                        {u.email}
                      </p>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 border ${
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Role badge and info */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isTargetGerente ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isTargetEncarregado ? (
                      <UserCog className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
                    )}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Cargo</span>
                      <span className={`text-xs font-bold ${
                        isTargetGerente
                          ? 'text-emerald-400'
                          : isTargetEncarregado
                          ? 'text-amber-400'
                          : 'text-blue-400'
                      }`}>
                        {isTargetGerente
                          ? 'GERENTE (Acesso Total)'
                          : isTargetEncarregado
                          ? 'ENCARREGADO (Abastecimentos & Relatórios)'
                          : 'FUNCIONÁRIO (Abastecimento Simples)'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500 font-medium">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : 'Ativo'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      title="Editar usuário e cargo"
                      className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/50 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleOpenPasswordModal(u)}
                      title="Redefinir senha de acesso"
                      className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-amber-300/90 hover:text-amber-200 border border-slate-700/50 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Senha</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      title={isActive ? 'Desativar acesso deste usuário' : 'Reativar acesso'}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                        isActive
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      <span>{isActive ? 'Desativar' : 'Ativar'}</span>
                    </button>

                    {!isSelf && (
                      <button
                        onClick={() => handleOpenDelete(u)}
                        title="Excluir usuário permanentemente"
                        className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Criar Novo Usuário */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-xl space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Novo Usuário</h3>
                  <p className="text-xs text-slate-400">Defina o nome, e-mail, senha e o cargo correspondente.</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Nome Completo *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ex: Carlos Silva"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">E-mail de Login *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="Ex: carlos@frota.com.br"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Senha Provisória / Acesso *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 4 caracteres"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Cargo / Nível de Acesso *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'funcionario' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      createForm.role === 'funcionario'
                        ? 'bg-blue-500/15 border-blue-500 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-xs text-blue-400">FUNCIONÁRIO</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Abastecimento simples mobile.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'encarregado' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      createForm.role === 'encarregado'
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <UserCog className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-xs text-amber-400">ENCARREGADO</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Abastecimentos e relatórios.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'gerente' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      createForm.role === 'gerente'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-xs text-emerald-400">GERENTE</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Acesso total e dono do sistema.</p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Usuário */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-xl space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200">
                  <Edit2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Editar Usuário</h3>
                  <p className="text-xs text-slate-400">Altere nome, e-mail, cargo e status de acesso.</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Nome Completo *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">E-mail de Login *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Cargo / Nível de Acesso *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, role: 'funcionario' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      editForm.role === 'funcionario'
                        ? 'bg-blue-500/15 border-blue-500 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-xs text-blue-400">FUNCIONÁRIO</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Abastecimento simples mobile.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, role: 'encarregado' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      editForm.role === 'encarregado'
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <UserCog className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-xs text-amber-400">ENCARREGADO</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Abastecimentos e relatórios.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, role: 'gerente' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      editForm.role === 'gerente'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-xs text-emerald-400">GERENTE</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Acesso total ao sistema.</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Status da Conta</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, active: 1 })}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                      editForm.active === 1
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" /> Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, active: 0 })}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                      editForm.active === 0
                        ? 'bg-rose-500/15 border-rose-500 text-rose-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <UserX className="w-4 h-4" /> Inativo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Redefinir Senha */}
      {passwordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Redefinir Senha</h3>
                  <p className="text-xs text-slate-400">Usuário: <strong className="text-white">{selectedUser.name}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Nova Senha *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite a nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Como Gerente, você define a nova senha sem precisar da antiga.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-all shadow-lg shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Atualizando...' : 'Alterar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Excluir Usuário */}
      {deleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 md:p-8 w-full max-w-md space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Excluir Usuário</h3>
                <p className="text-xs text-rose-300/80">Esta ação é permanente e não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <p>Tem certeza que deseja remover o usuário abaixo?</p>
              <div className="font-bold text-white text-sm">{selectedUser.name}</div>
              <div className="text-slate-400">{selectedUser.email}</div>
              <div className="text-slate-400">
                Cargo: <strong className="text-white">{normalizeRole(selectedUser.role).toUpperCase()}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-950/40 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

