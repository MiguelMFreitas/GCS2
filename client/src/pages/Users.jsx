import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, ShieldCheck, UserCheck, Lock, Mail, User } from 'lucide-react';
import api from '../services/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator'
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      setModalOpen(false);
      setForm({ name: '', email: '', password: '', role: 'operator' });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao cadastrar usuário.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
            <UsersIcon className="w-3.5 h-3.5" /> Controle de Acesso
          </span>
          <h1 className="text-2xl font-black text-white">Usuários e Permissões</h1>
          <p className="text-xs text-slate-400">Gerencie operadores frotistas e administradores do sistema.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-emerald-400 text-sm">
                {u.name.charAt(0)}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
              }`}>
                {u.role === 'admin' ? 'Administrador' : 'Frotista / Operador'}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-white text-base">{u.name}</h3>
              <p className="text-xs text-slate-400">{u.email}</p>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
              <span>Status: <strong className="text-emerald-400">Ativo</strong></span>
              <span>Cadastrado em {u.created_at?.split(' ')[0] || '2026-09-14'}</span>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Cadastrar Novo Usuário</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Nome do operador"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="operador@gcs.com.br"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Senha de Acesso</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Perfil / Função</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="operator">Operador / Frotista</option>
                  <option value="admin">Administrador Geral</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-400 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
