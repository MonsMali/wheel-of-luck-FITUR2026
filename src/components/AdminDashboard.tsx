'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PrizeType, Session } from '@/types';
import { calculateStatistics, PRIZES } from '@/utils/prizeLogic';
import { formatSessionTime } from '@/utils/sessionManager';

export default function AdminDashboard() {
  const {
    adminAuthenticated,
    authenticateAdmin,
    logoutAdmin,
    inventory,
    initialInventory,
    sessions,
    eventDay,
    setEventDay,
    startSession,
    endSession,
    resetInventory,
    adjustInventory,
    spinHistory,
    loadState,
  } = useGameStore();

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Auto-refresh: poll localStorage every second to see spin updates in real-time
  useEffect(() => {
    loadState();

    // Listen for localStorage changes from other tabs (main game page)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ruleta-algarve-state') {
        loadState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Poll every second for real-time updates
    const pollInterval = setInterval(() => {
      loadState();
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [loadState]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = authenticateAdmin(pin);
    if (!success) {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
    setPin('');
  };

  const handleReset = () => {
    resetInventory();
    setShowResetConfirm(false);
  };

  const exportData = () => {
    const data = {
      exportDate: new Date().toISOString(),
      inventory,
      sessions,
      spinHistory,
      statistics: calculateStatistics(inventory, initialInventory),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ruleta-algarve-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!adminAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            Panel de Administración
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white/80 mb-2">PIN de acceso</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className={`
                  w-full px-4 py-3 rounded-lg bg-white/10 text-white
                  border-2 transition-colors
                  ${pinError ? 'border-red-500' : 'border-white/20 focus:border-orange-500'}
                  focus:outline-none
                `}
                placeholder="Introduce el PIN"
                maxLength={10}
              />
              {pinError && (
                <p className="text-red-400 text-sm mt-2">PIN incorrecto</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
            >
              Acceder
            </button>
          </form>
        </div>
      </div>
    );
  }

  const stats = calculateStatistics(inventory, initialInventory);
  const daySessions = sessions.filter((s) => s.day === eventDay);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Panel de Administración - Ruleta Algarve
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm">En vivo - actualizando automáticamente</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-white/60 text-sm">Total giros</div>
              <div className="text-2xl font-bold text-white">{spinHistory.length}</div>
            </div>
            <button
              onClick={logoutAdmin}
              className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Active Session Alert */}
        {sessions.some(s => s.isActive) && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-300 font-medium">
              Sesión activa: {sessions.find(s => s.isActive)?.startTime} - {sessions.find(s => s.isActive)?.endTime}
            </span>
          </div>
        )}

        {/* Event Day Selection */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Día del evento</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setEventDay('saturday')}
              className={`
                flex-1 py-3 rounded-lg font-semibold transition-all
                ${eventDay === 'saturday'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'}
              `}
            >
              Sábado
            </button>
            <button
              onClick={() => setEventDay('sunday')}
              className={`
                flex-1 py-3 rounded-lg font-semibold transition-all
                ${eventDay === 'sunday'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'}
              `}
            >
              Domingo
            </button>
          </div>
        </div>

        {/* Inventory Management */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Inventario de premios</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat) => {
              const prize = PRIZES.find((p) => p.type === stat.type)!;
              return (
                <div
                  key={stat.type}
                  className="bg-white/5 rounded-lg p-4"
                  style={{ borderLeft: `4px solid ${prize.color}` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{prize.icon}</span>
                    <span className="text-white font-medium">{prize.displayName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-white/60">Restantes:</span>
                      <span className="text-white ml-2 font-bold">{stat.remaining}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Entregados:</span>
                      <span className="text-white ml-2">{stat.awarded}</span>
                    </div>
                  </div>
                  <div className="mt-2 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => adjustInventory(stat.type, -1)}
                      disabled={stat.remaining === 0}
                      className="flex-1 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => adjustInventory(stat.type, 1)}
                      className="flex-1 py-1 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30"
                    >
                      +1
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session Management */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Gestión de sesiones {eventDay === 'saturday' ? '(Sábado)' : eventDay === 'sunday' ? '(Domingo)' : ''}
          </h2>
          {!eventDay ? (
            <p className="text-white/60">Selecciona un día del evento para ver las sesiones.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {daySessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onStart={() => startSession(session.id)}
                  onEnd={() => endSession(session.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Spins */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Historial de giros</h2>
            <span className="text-white/60 text-sm">
              Total: {spinHistory.length} giros
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {spinHistory.length === 0 ? (
              <p className="text-white/60 text-center py-4">No hay giros registrados</p>
            ) : (
              [...spinHistory].reverse().slice(0, 50).map((record, index) => (
                <div
                  key={record.id}
                  className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-lg text-sm"
                >
                  <span className="text-white/60">
                    {new Date(record.timestamp).toLocaleTimeString('es-ES')}
                  </span>
                  <span className="text-white font-medium">{record.prizeDisplayName}</span>
                  <span className="text-white/40">{record.sessionId}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={exportData}
            className="px-6 py-3 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            Exportar datos
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-6 py-3 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Reiniciar todo
          </button>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 max-w-md mx-4">
              <h3 className="text-xl font-bold text-white mb-4">
                ¿Confirmar reinicio?
              </h3>
              <p className="text-white/70 mb-6">
                Esta acción reiniciará todo el inventario y borrará el historial de giros.
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Reiniciar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  onStart,
  onEnd,
}: {
  session: Session;
  onStart: () => void;
  onEnd: () => void;
}) {
  return (
    <div
      className={`
        p-4 rounded-lg border-2 transition-all
        ${session.isActive
          ? 'border-green-500 bg-green-500/10'
          : 'border-white/10 bg-white/5'}
      `}
    >
      <div className="text-white font-semibold mb-2">
        {formatSessionTime(session)}
      </div>
      <div className="text-sm text-white/60 mb-3">
        <div>Vales objetivo: {session.targetVouchers}</div>
        <div>Vales entregados: {session.vouchersAwarded}</div>
      </div>
      {session.isActive ? (
        <button
          onClick={onEnd}
          className="w-full py-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors"
        >
          Finalizar sesión
        </button>
      ) : (
        <button
          onClick={onStart}
          className="w-full py-2 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition-colors"
        >
          Iniciar sesión
        </button>
      )}
    </div>
  );
}
