import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFuelingCart } from '../context/FuelingCartContext';
import {
  LayoutDashboard,
  Fuel,
  ShoppingCart,
  Truck,
  History,
  FileBarChart,
  Wrench,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  AlertCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function Layout({ children, activeTab, setActiveTab, onOpenVehicleModal }) {
  const { user, logout } = useAuth();
  const { itemCount, totalCost, hasUnfinishedSession } = useFuelingCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'weekly-fueling', label: 'Abastecimento da Semana', icon: Fuel, badge: 'Principal' },
    { id: 'cart', label: 'Carrinho de Abastecimento', icon: ShoppingCart, count: itemCount },
    { id: 'vehicles', label: 'Veículos', icon: Truck },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'reports', label: 'Relatórios', icon: FileBarChart },
    { id: 'expenses', label: 'Despesas e Manutenções', icon: Wrench },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row pb-24 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 border-r border-slate-800 shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Fuel className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                GCS<span className="text-emerald-400 font-extrabold">2</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">Frota</span>
              </h1>
              <p className="text-xs text-slate-400">Gestão & Abastecimento</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-white text-emerald-700' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {item.count}
                  </span>
                )}
                {item.badge && !item.count && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-black text-xs text-emerald-400 shrink-0">
                {(user?.name || user?.username || 'G').charAt(0).toUpperCase()}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-bold text-white truncate">{user?.name || user?.username || 'Gerente'}</p>
                <p className="text-[11px] text-emerald-400 font-semibold truncate">
                  {user?.role === 'admin' ? 'Administrador' : (user?.role === 'operator' ? 'Operador de Pista' : (user?.role || 'Usuário'))}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sair do sistema"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Mobile Bar */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow">
              <Fuel className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <span className="font-bold text-base text-white">GCS<span className="text-emerald-400">2</span> Frota</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('cart')}
              className="relative p-2 bg-slate-800 rounded-lg text-slate-200 hover:text-emerald-400"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-slate-800 rounded-lg text-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-1.5 z-40">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-xs font-bold">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between px-2">
              <div>
                <span className="text-xs font-bold text-white block">{user?.name || user?.username || 'Gerente'}</span>
                <span className="text-[10px] text-emerald-400 font-semibold">{user?.role === 'admin' ? 'Administrador' : 'Operador'}</span>
              </div>
              <button onClick={logout} className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10">
                <LogOut className="w-3.5 h-3.5" /> Sair
              </button>
            </div>
          </div>
        )}

        {/* Unfinished Session Alert Banner */}
        {hasUnfinishedSession && activeTab !== 'cart' && activeTab !== 'weekly-fueling' && (
          <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-transparent border-b border-amber-500/30 px-4 py-2.5 text-amber-200 text-xs md:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Você possui um <strong>abastecimento em andamento</strong> ({itemCount} {itemCount === 1 ? 'veículo' : 'veículos'}).</span>
            </div>
            <button
              onClick={() => setActiveTab('weekly-fueling')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-md text-xs transition-colors flex items-center gap-1 shrink-0 ml-2"
            >
              Continuar Abastecimento <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Floating Bottom Cart Bar (Mobile Only - Item 51) */}
      {itemCount > 0 && activeTab !== 'cart' && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-50">
          <button
            onClick={() => setActiveTab('cart')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-2xl shadow-2xl shadow-emerald-950/80 flex items-center justify-between font-bold border border-emerald-400/30 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-950/30 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs text-emerald-100 uppercase tracking-wider font-semibold">Ver Abastecimento</p>
                <p className="text-sm font-extrabold text-white">🛒 {itemCount} {itemCount === 1 ? 'veículo adicionado' : 'veículos adicionados'}</p>
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <p className="text-[11px] text-emerald-200">Total parcial</p>
                <p className="text-sm font-black text-white">R$ {Number(totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-200" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
