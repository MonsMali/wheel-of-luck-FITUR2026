'use client';

import React from 'react';
import { Session, PrizeInventory } from '@/types';
import { formatSessionTime } from '@/utils/sessionManager';

interface SessionStatusProps {
  currentSession: Session | null;
  inventory: PrizeInventory;
  sessionEnded: boolean;
}

export default function SessionStatus({
  currentSession,
  inventory,
  sessionEnded,
}: SessionStatusProps) {
  const totalPrizes = inventory.voucher + inventory.tasting + inventory.surprise;

  if (sessionEnded || totalPrizes === 0) {
    return (
      <div className="text-center p-4 bg-amber-500/20 backdrop-blur-sm rounded-xl border border-amber-400/30">
        <p className="text-lg text-amber-200 font-medium">
          Sesión finalizada. Vuelve en la próxima franja horaria.
        </p>
      </div>
    );
  }

  if (!currentSession) {
    return null;
  }

  return (
    <div className="text-center p-4 bg-green-500/20 backdrop-blur-sm rounded-xl border border-green-400/30">
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        <span className="text-green-300 font-semibold">Sesión activa</span>
      </div>
      <p className="text-white/80">
        {formatSessionTime(currentSession)}
      </p>
      <p className="text-sm text-white/60 mt-1">
        Premios restantes: {totalPrizes}
      </p>
    </div>
  );
}
