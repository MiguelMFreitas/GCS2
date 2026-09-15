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
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import VehicleFormModal from './components/VehicleFormModal';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
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
      {activeTab === 'dashboard' && (
        <Dashboard
          setActiveTab={setActiveTab}
          onOpenFuelingModal={() => setActiveTab('weekly-fueling')}
        />
      )}

      {activeTab === 'weekly-fueling' && (
        <WeeklyFueling
          setActiveTab={setActiveTab}
          onOpenVehicleModal={() => setGlobalVehicleModalOpen(true)}
        />
      )}

      {activeTab === 'cart' && (
        <FuelingCart
          setActiveTab={setActiveTab}
          onSessionFinalized={handleSessionFinalized}
        />
      )}

      {activeTab === 'session-report' && (
        <SessionReport
          sessionId={activeReportSessionId}
          onBack={() => setActiveTab('history')}
          setActiveTab={setActiveTab}
        />
      )}

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

      {activeTab === 'history' && (
        <History
          onSelectSession={handleSelectSession}
        />
      )}

      {activeTab === 'expenses' && <Expenses />}

      {activeTab === 'reports' && <Reports />}

      {activeTab === 'users' && <Users />}

      {activeTab === 'settings' && <Settings />}

      {/* Global Vehicle Form Modal */}
      <VehicleFormModal
        isOpen={globalVehicleModalOpen}
        onClose={() => setGlobalVehicleModalOpen(false)}
        onSaved={() => {}}
      />
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
