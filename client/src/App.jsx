import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FuelingCartProvider } from './context/FuelingCartContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WeeklyFueling from './pages/WeeklyFueling';
import FuelingCart from './pages/FuelingCart';
import SessionReport from './pages/SessionReport';
import Vehicles from './pages/Vehicles';
import VehicleProfile from './pages/VehicleProfile';
import History from './pages/History';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import VehicleFormModal from './components/VehicleFormModal';
import EmployeeFueling from './pages/EmployeeFueling';
import { AlertCircle, ShieldAlert } from 'lucide-react';

function MainApp() {
  const { isAuthenticated, loading, user } = useAuth();

  const role = String(user?.role || '').toLowerCase();
  const isGerente = role === 'admin' || role === 'gerente';
  const isEncarregado = role === 'encarregado' || role === 'supervisor';
  const isFuncionario = !isGerente && !isEncarregado;

  // Initial tab: auto-load fueling system by default
  const [activeTab, setActiveTab] = useState('weekly-fueling');
  const [activeVehicleId, setActiveVehicleId] = useState(null);
  const [activeReportSessionId, setActiveReportSessionId] = useState(null);
  const [globalVehicleModalOpen, setGlobalVehicleModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // FUNCIONÁRIO: Dedicated single mobile-first operational screen
  if (isFuncionario) {
    return <EmployeeFueling />;
  }

  const handleSelectVehicle = (vehicleId) => {
    setActiveVehicleId(vehicleId);
    setActiveTab('vehicle-profile');
  };

  const handleSelectSession = (sessionId) => {
    setActiveReportSessionId(sessionId);
    setActiveTab('session-report');
  };

  const handleSessionFinalized = (sessionId) => {
    setActiveReportSessionId(sessionId);
    setActiveTab('session-report');
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenVehicleModal={() => setGlobalVehicleModalOpen(true)}
    >
      {/* Dashboard (GERENTE only) */}
      {activeTab === 'dashboard' && (
        isGerente ? (
          <Dashboard
            setActiveTab={setActiveTab}
            onOpenFuelingModal={() => setActiveTab('weekly-fueling')}
          />
        ) : (
          <WeeklyFueling
            setActiveTab={setActiveTab}
            onOpenVehicleModal={() => {}}
          />
        )
      )}

      {/* Abastecimento da Semana (GERENTE & ENCARREGADO) */}
      {activeTab === 'weekly-fueling' && (
        <WeeklyFueling
          setActiveTab={setActiveTab}
          onOpenVehicleModal={() => isGerente && setGlobalVehicleModalOpen(true)}
        />
      )}

      {/* Carrinho de Abastecimento (GERENTE & ENCARREGADO) */}
      {activeTab === 'cart' && (
        <FuelingCart
          setActiveTab={setActiveTab}
          onSessionFinalized={handleSessionFinalized}
        />
      )}

      {/* Relatório de Sessão (GERENTE & ENCARREGADO) */}
      {activeTab === 'session-report' && (
        <SessionReport
          sessionId={activeReportSessionId}
          onBack={() => setActiveTab('history')}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Veículos (GERENTE: Gerenciamento | ENCARREGADO: Consulta) */}
      {activeTab === 'vehicles' && (
        <Vehicles
          onSelectVehicle={handleSelectVehicle}
        />
      )}

      {activeTab === 'vehicle-profile' && (
        <VehicleProfile
          vehicleId={activeVehicleId}
          onBack={() => setActiveTab('vehicles')}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Histórico (GERENTE & ENCARREGADO) */}
      {activeTab === 'history' && (
        <History
          onSelectSession={handleSelectSession}
        />
      )}

      {/* Relatórios (GERENTE & ENCARREGADO) */}
      {activeTab === 'reports' && <Reports />}

      {/* Usuários (GERENTE only) */}
      {activeTab === 'users' && (
        isGerente ? (
          <Users />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-lg mx-auto my-12 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Acesso Exclusivo do Gerente</h2>
            <p className="text-xs text-slate-400 mb-6">
              Apenas o Gerente / Administrador possui permissão para gerenciar contas de usuários e níveis de acesso.
            </p>
            <button
              onClick={() => setActiveTab(isGerente ? 'dashboard' : 'weekly-fueling')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Voltar ao Início
            </button>
          </div>
        )
      )}

      {/* Configurações (GERENTE only) */}
      {activeTab === 'settings' && (
        isGerente ? (
          <Settings />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-lg mx-auto my-12 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Acesso Exclusivo do Gerente</h2>
            <p className="text-xs text-slate-400 mb-6">
              Apenas o Gerente / Administrador possui permissão para alterar configurações do sistema.
            </p>
            <button
              onClick={() => setActiveTab(isGerente ? 'dashboard' : 'weekly-fueling')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Voltar ao Início
            </button>
          </div>
        )
      )}

      {/* Global Vehicle Form Modal (GERENTE only) */}
      {isGerente && (
        <VehicleFormModal
          isOpen={globalVehicleModalOpen}
          onClose={() => setGlobalVehicleModalOpen(false)}
          onSaved={() => {}}
        />
      )}
    </Layout>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <FuelingCartProvider>
        <MainApp />
      </FuelingCartProvider>
    </AuthProvider>
  );
}
