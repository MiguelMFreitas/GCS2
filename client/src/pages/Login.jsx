import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Fuel, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { authService } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('admin@gcs.com.br');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotFeedback, setForgotFeedback] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Erro ao realizar login. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (email, pass) => {
    setIdentifier(email);
    setPassword(pass);
    login(email, pass).catch((err) => {
      setErrorMsg('Erro no login demo: ' + (err.response?.data?.error || 'Tente novamente.'));
    });
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await authService.forgotPassword({ email: forgotEmail });
      setForgotFeedback(res.data.message);
    } catch (err) {
      setForgotFeedback('Erro: ' + (err.response?.data?.error || 'Não foi possível recuperar a senha.'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Logo and Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/60 mb-3">
            <Fuel className="w-9 h-9 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            GCS<span className="text-emerald-400">2</span> Frota
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Controle de Abastecimento, Consumo e Gestão de Frota
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950/80">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Usuário ou E-mail
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="seu.email@gcs.com.br"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all disabled:opacity-50"
            >
              {loading ? 'Entrando...' : (
                <>
                  Entrar no Sistema <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Acesso Rápido de Demonstração
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@gcs.com.br', 'admin123')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Administrador
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('operador@gcs.com.br', '123456')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                Operador Frotista
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500">
          GCS2 Gestão Operacional de Frota &copy; 2026 • Todos os direitos reservados
        </p>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Recuperar Senha</h3>
            <p className="text-xs text-slate-400">
              Digite seu e-mail cadastrado para receber as orientações de redefinição.
            </p>

            {forgotFeedback ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                {forgotFeedback}
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  placeholder="seu.email@gcs.com.br"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Enviar Instruções
                </button>
              </form>
            )}

            <button
              onClick={() => {
                setForgotModalOpen(false);
                setForgotFeedback('');
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-2"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
