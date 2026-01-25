'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PrizeType, Session } from '@/types';
import { calculateStatistics, PRIZES, selectPrize } from '@/utils/prizeLogic';
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
    restartSession,
    resetInventory,
    adjustInventory,
    spinHistory,
    loadState,
    loadFromServer,
    syncSessionConfig,
  } = useGameStore();

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationResults, setSimulationResults] = useState<{
    sessions: { id: string; spins: number; vouchers: number; tastings: number; surprises: number }[];
    tests: { name: string; passed: boolean; details: string }[];
  } | null>(null);

  // Auto-refresh: poll both localStorage and server for real-time updates
  useEffect(() => {
    // First load from localStorage (fast)
    loadState();

    // Then load from server (authoritative)
    loadFromServer();

    // Listen for localStorage changes from other tabs (main game page)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ruleta-algarve-state') {
        loadState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Poll localStorage every second for real-time updates (same device)
    const pollInterval = setInterval(() => {
      loadState();
    }, 1000);

    // Poll server every 3 seconds for cross-device sync (game on kiosk, admin on laptop)
    const serverPollInterval = setInterval(() => {
      loadFromServer();
    }, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
      clearInterval(serverPollInterval);
    };
  }, [loadState, loadFromServer]);

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
    // Calculate per-session statistics
    const sessionStats = sessions.map(session => {
      const sessionSpins = spinHistory.filter(s => s.sessionId === session.id);
      const voucherCount = sessionSpins.filter(s => s.prizeType === 'voucher').length;
      const tastingCount = sessionSpins.filter(s => s.prizeType === 'tasting').length;
      const surpriseCount = sessionSpins.filter(s => s.prizeType === 'surprise').length;
      return {
        sessionId: session.id,
        day: session.day,
        scheduledTime: `${session.startTime} - ${session.endTime}`,
        durationMinutes: session.durationMinutes,
        totalSpins: sessionSpins.length,
        prizes: {
          experiencia: voucherCount,
          saboreo: tastingCount,
          regalos: surpriseCount,
        },
        vouchersAwarded: session.vouchersAwarded,
      };
    });

    // Format timestamps in Spain time for the export
    const spinHistoryWithSpainTime = spinHistory.map(record => ({
      ...record,
      timestampUTC: record.timestamp,
      timestampSpain: new Date(record.timestamp).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
    }));

    const data = {
      exportDate: new Date().toISOString(),
      exportDateSpain: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      inventory,
      sessions,
      sessionStats,
      spinHistory: spinHistoryWithSpainTime,
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

  // Simulation function - tests the wheel logic WITHOUT saving any data
  const runSimulation = () => {
    const tests: { name: string; passed: boolean; details: string }[] = [];

    // Test 1: Vouchers blocked in first 15 spins
    {
      const testSession = { ...sessions[4], vouchersAwarded: 0 }; // Use sun-11 as template
      let voucherCount = 0;
      for (let spinCount = 0; spinCount < 15; spinCount++) {
        for (let i = 0; i < 100; i++) {
          const prize = selectPrize(inventory, testSession, spinCount);
          if (prize?.type === 'voucher') voucherCount++;
        }
      }
      tests.push({
        name: 'Vouchers blocked in first 15 spins',
        passed: voucherCount === 0,
        details: voucherCount === 0
          ? 'No vouchers in 1,500 test spins (spins 0-14)'
          : `PROBLEM: ${voucherCount} vouchers awarded in first 15 spins`,
      });
    }

    // Test 2: Vouchers possible after spin 15
    {
      const testSession = { ...sessions[4], vouchersAwarded: 0 };
      let voucherCount = 0;
      for (let i = 0; i < 5000; i++) {
        const prize = selectPrize(inventory, testSession, 20);
        if (prize?.type === 'voucher') voucherCount++;
      }
      tests.push({
        name: 'Vouchers possible after spin 15',
        passed: voucherCount > 0,
        details: voucherCount > 0
          ? `${voucherCount} vouchers in 5,000 test spins (${(voucherCount/50).toFixed(1)}%)`
          : 'PROBLEM: No vouchers awarded after spin 15',
      });
    }

    // Test 3: Vouchers blocked when session already has one
    {
      const testSession = { ...sessions[4], vouchersAwarded: 1 };
      let voucherCount = 0;
      for (let i = 0; i < 5000; i++) {
        const prize = selectPrize(inventory, testSession, 50);
        if (prize?.type === 'voucher') voucherCount++;
      }
      tests.push({
        name: 'Max 1 voucher per session enforced',
        passed: voucherCount === 0,
        details: voucherCount === 0
          ? 'No extra vouchers in 5,000 test spins when session has 1'
          : `PROBLEM: ${voucherCount} extra vouchers awarded!`,
      });
    }

    // Simulate 4 Sunday sessions (100 spins each)
    const sundaySessions = sessions.filter(s => s.day === 'sunday');
    const sessionResults = sundaySessions.map(session => {
      const simSession = { ...session, vouchersAwarded: 0 };
      const simInventory = { ...inventory };
      const counts = { vouchers: 0, tastings: 0, surprises: 0 };

      for (let spinCount = 0; spinCount < 100; spinCount++) {
        // Apply defense-in-depth: use max of session counter and already-won vouchers
        const effectiveVouchers = Math.max(simSession.vouchersAwarded, counts.vouchers);
        const sessionForSpin = { ...simSession, vouchersAwarded: effectiveVouchers };

        const prize = selectPrize(simInventory, sessionForSpin, spinCount);
        if (prize) {
          if (prize.type === 'voucher') {
            counts.vouchers++;
            simSession.vouchersAwarded++;
          } else if (prize.type === 'tasting') {
            counts.tastings++;
          } else {
            counts.surprises++;
          }
        }
      }

      return {
        id: session.id,
        spins: 100,
        vouchers: counts.vouchers,
        tastings: counts.tastings,
        surprises: counts.surprises,
      };
    });

    // Check if any session got more than 1 voucher
    const maxVouchersInSession = Math.max(...sessionResults.map(s => s.vouchers));
    tests.push({
      name: 'Session simulation (100 spins x 4 sessions)',
      passed: maxVouchersInSession <= 1,
      details: maxVouchersInSession <= 1
        ? `Max ${maxVouchersInSession} voucher per session - correct!`
        : `PROBLEM: A session got ${maxVouchersInSession} vouchers!`,
    });

    setSimulationResults({ sessions: sessionResults, tests });
    setShowSimulation(true);
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
              {daySessions.map((session) => {
                const sessionSpinCount = spinHistory.filter(s => s.sessionId === session.id).length;
                return (
                  <SessionCard
                    key={session.id}
                    session={session}
                    spinCount={sessionSpinCount}
                    onStart={() => startSession(session.id)}
                    onEnd={() => endSession(session.id)}
                    onRestart={() => restartSession(session.id)}
                  />
                );
              })}
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
              [...spinHistory].reverse().slice(0, 50).map((record) => (
                <div
                  key={record.id}
                  className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-lg text-sm"
                >
                  <span className="text-white/60">
                    {new Date(record.timestamp).toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' })}
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
            onClick={syncSessionConfig}
            className="px-6 py-3 bg-yellow-500/20 text-yellow-300 rounded-lg hover:bg-yellow-500/30 transition-colors"
          >
            Actualizar horarios sesiones
          </button>
          <button
            onClick={runSimulation}
            className="px-6 py-3 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
          >
            Simular ruleta (sin guardar)
          </button>
          <button
            onClick={() => loadFromServer()}
            className="px-6 py-3 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            Sincronizar desde servidor
          </button>
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

        {/* Simulation Results Modal */}
        {showSimulation && simulationResults && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">
                Resultados de Simulación
              </h3>
              <p className="text-white/60 text-sm mb-4">
                Esta simulación NO afecta los datos reales. Solo verifica que la lógica funciona correctamente.
              </p>

              {/* Test Results */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3">Tests de Lógica:</h4>
                <div className="space-y-2">
                  {simulationResults.tests.map((test, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg ${test.passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{test.passed ? '✅' : '❌'}</span>
                        <span className={test.passed ? 'text-green-300' : 'text-red-300'}>
                          {test.name}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm mt-1 ml-8">{test.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session Simulation Results */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3">Simulación de Sesiones (100 giros c/u):</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {simulationResults.sessions.map((session) => (
                    <div key={session.id} className="bg-white/5 rounded-lg p-3 text-sm">
                      <div className="text-white font-medium mb-2">{session.id}</div>
                      <div className="text-yellow-400">Experiencias: {session.vouchers}</div>
                      <div className="text-orange-300">Saboreos: {session.tastings}</div>
                      <div className="text-blue-300">Regalos: {session.surprises}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowSimulation(false)}
                className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  spinCount,
  onStart,
  onEnd,
  onRestart,
}: {
  session: Session;
  spinCount: number;
  onStart: () => void;
  onEnd: () => void;
  onRestart: () => void;
}) {
  const [timeRemaining, setTimeRemaining] = React.useState<string>('');

  // Calculate time remaining for active sessions
  // Uses session-specific duration (60 min for Saturday, 45 min for Sunday)
  React.useEffect(() => {
    if (!session.isActive || !session.actualStartTime) return;

    const sessionDurationMs = (session.durationMinutes || 60) * 60 * 1000;

    const updateTime = () => {
      const startTime = new Date(session.actualStartTime!).getTime();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, sessionDurationMs - elapsed);

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [session.isActive, session.actualStartTime, session.durationMinutes]);

  const isUsed = !!session.actualEndTime;

  return (
    <div
      className={`
        p-4 rounded-lg border-2 transition-all
        ${session.isActive
          ? 'border-green-500 bg-green-500/10'
          : isUsed
            ? 'border-gray-500 bg-gray-500/10 opacity-60'
            : 'border-white/10 bg-white/5'}
      `}
    >
      <div className="text-white font-semibold mb-2">
        {formatSessionTime(session)}
        {isUsed && <span className="ml-2 text-xs text-gray-400">(Usada)</span>}
      </div>
      <div className="text-sm text-white/60 mb-3">
        <div>Giros: <span className="text-white font-medium">{spinCount}</span></div>
        <div>Experiencias: <span className={session.vouchersAwarded > 0 ? 'text-yellow-400 font-medium' : ''}>{session.vouchersAwarded}</span></div>
        {session.isActive && timeRemaining && (
          <div className="text-green-400 font-mono mt-1">
            Tiempo restante: {timeRemaining}
          </div>
        )}
      </div>
      {session.isActive ? (
        <button
          onClick={onEnd}
          className="w-full py-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors"
        >
          Finalizar sesión
        </button>
      ) : isUsed ? (
        <button
          onClick={onRestart}
          className="w-full py-2 bg-orange-500/20 text-orange-300 rounded hover:bg-orange-500/30 transition-colors"
        >
          ⚠️ Reiniciar sesión
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
