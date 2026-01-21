'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/gameStore';
import { selectPrize } from '@/utils/prizeLogic';
import { findCurrentSession, getSpainTime } from '@/utils/sessionManager';
import PrizeWheel from './PrizeWheel';
import SpinButton from './SpinButton';
import CountdownTimer from './CountdownTimer';
import SessionStatus from './SessionStatus';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { Prize, SpinRecord } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Dynamic import - WinModal only loads after a win (reduces initial bundle)
const WinModal = dynamic(() => import('./WinModal'), {
  ssr: false,
  loading: () => null,
});

// Rate limiting - minimum time between spins (in ms)
const MIN_SPIN_INTERVAL = 6000;

export default function GamePage() {
  const {
    inventory,
    sessions,
    eventDay,
    isSpinning,
    setIsSpinning,
    lastWin,
    setLastWin,
    showWinModal,
    setShowWinModal,
    decrementPrize,
    addSpinRecord,
    incrementSessionVoucher,
    loadState,
    loadFromServer,
    spinHistory,
    endSession,
  } = useGameStore();

  const [canSpin, setCanSpin] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [currentSession, setCurrentSession] = useState(useGameStore.getState().currentSession);
  const [targetPrize, setTargetPrize] = useState<Prize | null>(null);
  const lastSpinTimeRef = useRef<number>(0);

  const { playSound, playSpinningSound } = useSoundEffects();

  // Load saved state on mount and listen for changes from other tabs
  useEffect(() => {
    // First load from localStorage (fast)
    loadState();

    // Then load from server (authoritative, handles device changes/refreshes)
    loadFromServer();

    // Listen for localStorage changes from other tabs (admin panel)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ruleta-algarve-state') {
        loadState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Poll localStorage for changes every 2 seconds (for same-device sync)
    const pollInterval = setInterval(() => {
      loadState();
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [loadState, loadFromServer]);

  // Session duration in milliseconds (1 hour)
  const SESSION_DURATION_MS = 60 * 60 * 1000;

  // Check session status periodically
  useEffect(() => {
    const checkSession = () => {
      const now = new Date();

      // Find any active session (manually started by admin) - check ALL sessions
      const activeSession = sessions.find(s => s.isActive === true);

      // Check if any prizes remain
      const totalPrizes = inventory.voucher + inventory.tasting + inventory.surprise;

      if (activeSession) {
        // AUTO-END CHECK: If 1 hour has passed since actualStartTime, end the session
        if (activeSession.actualStartTime) {
          const startTime = new Date(activeSession.actualStartTime).getTime();
          const elapsed = now.getTime() - startTime;

          if (elapsed >= SESSION_DURATION_MS) {
            console.log(`Auto-ending session ${activeSession.id} after 1 hour`);
            endSession(activeSession.id);
            setCanSpin(false);
            setSessionEnded(true);
            return;
          }
        }

        setCurrentSession(activeSession);

        // Check if we still have prizes
        if (totalPrizes === 0) {
          setCanSpin(false);
          setSessionEnded(true);
        } else {
          // Admin has manually started this session - allow spinning
          setCanSpin(true);
          setSessionEnded(false);
        }
      } else {
        // No active session - show countdown
        const spainNow = getSpainTime(); // Use Spain time for session lookup
        const session = findCurrentSession(sessions, eventDay, spainNow);
        if (session) {
          setCurrentSession(session);
        } else {
          setCurrentSession(null);
        }
        setCanSpin(false);
        setSessionEnded(false);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 1000);

    return () => clearInterval(interval);
  }, [sessions, eventDay, inventory, endSession]);

  const handleSpin = useCallback(() => {
    // Rate limiting check
    const now = Date.now();
    if (now - lastSpinTimeRef.current < MIN_SPIN_INTERVAL) {
      return;
    }
    lastSpinTimeRef.current = now;

    // Check if we can spin
    if (isSpinning || !canSpin) return;

    // Count spins in current session for voucher guarantee mechanism
    const sessionSpinCount = currentSession
      ? spinHistory.filter(s => s.sessionId === currentSession.id).length
      : 0;

    // Select the prize before spinning (pass session spin count for guarantee logic)
    const prize = selectPrize(inventory, currentSession, sessionSpinCount);
    if (!prize) {
      setSessionEnded(true);
      return;
    }

    // Set target prize and start spinning
    setTargetPrize(prize);
    setIsSpinning(true);

    // Play sounds
    playSound('spin');
    playSpinningSound(5000);
  }, [isSpinning, canSpin, inventory, currentSession, spinHistory, setIsSpinning, playSound, playSpinningSound]);

  const handleSpinComplete = useCallback((prize: Prize) => {
    // Update inventory
    decrementPrize(prize.type);

    // Record the spin
    const record: SpinRecord = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      sessionId: currentSession?.id || 'unknown',
      prizeType: prize.type,
      prizeDisplayName: prize.displayName,
    };
    addSpinRecord(record);

    // If voucher, update session counter
    if (prize.type === 'voucher' && currentSession) {
      incrementSessionVoucher(currentSession.id);
    }

    // Show win modal
    setLastWin(prize);
    setShowWinModal(true);

    // Play win sound
    if (prize.type === 'voucher') {
      playSound('bigWin');
    } else {
      playSound('win');
    }
  }, [currentSession, decrementPrize, addSpinRecord, incrementSessionVoucher, setLastWin, setShowWinModal, playSound]);

  const handleCloseModal = useCallback(() => {
    setShowWinModal(false);
    setLastWin(null);
    setTargetPrize(null);
  }, [setShowWinModal, setLastWin]);

  // Check if we should show countdown
  const showCountdown = !canSpin && !sessionEnded && !currentSession?.isActive;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-orange-700 flex flex-col">
      {/* Header */}
      <header className="py-6 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
          Ruleta de la Suerte Algarve
        </h1>
        <p className="text-white/80 mt-2">FITUR 2026</p>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {/* Session status */}
        <div className="w-full max-w-md mb-6">
          {canSpin ? (
            <SessionStatus
              currentSession={currentSession}
              inventory={inventory}
              sessionEnded={sessionEnded}
            />
          ) : sessionEnded ? (
            <SessionStatus
              currentSession={currentSession}
              inventory={inventory}
              sessionEnded={sessionEnded}
            />
          ) : showCountdown ? (
            <CountdownTimer sessions={sessions} eventDay={eventDay} />
          ) : null}
        </div>

        {/* Prize Wheel */}
        <div className="mb-6">
          <PrizeWheel
            onSpinComplete={handleSpinComplete}
            isSpinning={isSpinning}
            setIsSpinning={setIsSpinning}
            targetPrize={targetPrize}
            disabled={!canSpin || isSpinning}
          />
        </div>

        {/* Prize Legend */}
        <div className="flex justify-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFD700' }} />
            <span className="text-white text-sm">🎁 Experiencia</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E85D04' }} />
            <span className="text-white text-sm">🍷 Saboreo</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0077B6' }} />
            <span className="text-white text-sm">🎉 Regalos</span>
          </div>
        </div>

        {/* Spin Button */}
        <SpinButton
          onClick={handleSpin}
          disabled={!canSpin || sessionEnded}
          isSpinning={isSpinning}
        />

        {/* Admin link */}
        <div className="mt-8">
          <a
            href="/admin"
            className="text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            Panel de administración
          </a>
        </div>
      </main>

      {/* Win Modal */}
      {lastWin && (
        <WinModal
          prize={lastWin}
          isOpen={showWinModal}
          onClose={handleCloseModal}
        />
      )}

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
