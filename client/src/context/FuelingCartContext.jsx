import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sessionService } from '../services/api';
import { useAuth } from './AuthContext';

const FuelingCartContext = createContext(null);

export function FuelingCartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await sessionService.getActive();
      setActiveSession(res.data.session);
      setCartItems(res.data.records || []);
      setSummary(res.data.summary || null);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar carrinho:', err);
      setError('Falha ao sincronizar o carrinho de abastecimento.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setActiveSession(null);
      setCartItems([]);
      setSummary(null);
    }
  }, [isAuthenticated, refreshCart]);

  const startSession = async (date, notes) => {
    try {
      const res = await sessionService.startSession({ date, notes });
      await refreshCart();
      return res.data.session;
    } catch (err) {
      throw err;
    }
  };

  const addToCart = async (vehicleFuelData, force = false) => {
    if (!activeSession) {
      // Auto-start a session if none is open
      const newSess = await startSession();
      const res = await sessionService.addToCart(newSess.id, { ...vehicleFuelData, force });
      await refreshCart();
      return res.data;
    }

    try {
      const res = await sessionService.addToCart(activeSession.id, { ...vehicleFuelData, force });
      await refreshCart();
      return res.data;
    } catch (err) {
      if (err.response?.status === 409) {
        return {
          duplicate: true,
          message: err.response.data.message,
          existingRecord: err.response.data.existingRecord
        };
      }
      throw err;
    }
  };

  const updateCartItem = async (recordId, updateData) => {
    if (!activeSession) return;
    const res = await sessionService.updateCartItem(activeSession.id, recordId, updateData);
    await refreshCart();
    return res.data;
  };

  const removeFromCart = async (recordId, justification) => {
    if (!activeSession) return;
    const res = await sessionService.removeFromCart(activeSession.id, recordId, { justification });
    await refreshCart();
    return res.data;
  };

  const finalizeCurrentSession = async () => {
    if (!activeSession) throw new Error('Nenhuma sessão ativa');
    const res = await sessionService.finalizeSession(activeSession.id);
    const finalizedData = res.data;
    await refreshCart();
    return finalizedData;
  };

  const cancelCurrentSession = async (justification) => {
    if (!activeSession) return;
    await sessionService.cancelSession(activeSession.id, { justification });
    await refreshCart();
  };

  return (
    <FuelingCartContext.Provider
      value={{
        activeSession,
        cartItems,
        summary,
        loading,
        error,
        itemCount: cartItems.length,
        totalCost: summary?.total_cost || 0,
        totalLiters: summary?.total_liters || 0,
        hasUnfinishedSession: !!activeSession && activeSession.status === 'in_progress',
        refreshCart,
        startSession,
        addToCart,
        updateCartItem,
        removeFromCart,
        finalizeCurrentSession,
        cancelCurrentSession
      }}
    >
      {children}
    </FuelingCartContext.Provider>
  );
}

export function useFuelingCart() {
  const context = useContext(FuelingCartContext);
  if (!context) {
    throw new Error('useFuelingCart deve ser usado dentro de um FuelingCartProvider');
  }
  return context;
}
