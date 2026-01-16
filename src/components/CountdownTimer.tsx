'use client';

import React, { useState, useEffect } from 'react';
import { Session } from '@/types';
import {
  findNextSession,
  getTimeUntilSession,
  formatTime,
  getSessionScheduleText,
  TimeUntilNext,
} from '@/utils/sessionManager';

interface CountdownTimerProps {
  sessions: Session[];
  eventDay: 'saturday' | 'sunday' | null;
}

export default function CountdownTimer({ sessions, eventDay }: CountdownTimerProps) {
  const [timeUntil, setTimeUntil] = useState<TimeUntilNext | null>(null);
  const [nextSession, setNextSession] = useState<Session | null>(null);
  const [scheduleText, setScheduleText] = useState<string[]>([]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const next = findNextSession(sessions, eventDay, now);
      setNextSession(next);

      if (next) {
        const time = getTimeUntilSession(next, now);
        setTimeUntil(time);
      } else {
        setTimeUntil(null);
      }

      setScheduleText(getSessionScheduleText(sessions, eventDay));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [sessions, eventDay]);

  if (!eventDay) {
    return (
      <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-2xl">
        <p className="text-xl text-white/90">
          Configuración del evento pendiente
        </p>
      </div>
    );
  }

  return (
    <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-2xl max-w-md mx-auto">
      <h3 className="text-xl font-semibold text-white mb-4">
        La ruleta estará disponible durante las siguientes sesiones:
      </h3>

      {/* Session schedule */}
      <div className="mb-6 space-y-2">
        {scheduleText.map((time, index) => (
          <div
            key={index}
            className={`
              px-4 py-2 rounded-lg text-lg font-medium
              ${nextSession && sessions.filter(s => s.day === eventDay)[index]?.id === nextSession.id
                ? 'bg-orange-500/30 text-orange-200 border border-orange-400/50'
                : 'bg-white/5 text-white/70'}
            `}
          >
            {time}
          </div>
        ))}
      </div>

      {/* Countdown */}
      {timeUntil && timeUntil.totalSeconds > 0 ? (
        <div className="mt-4">
          <p className="text-white/80 mb-2">Próxima sesión en:</p>
          <div className="flex justify-center gap-4">
            <TimeBlock value={timeUntil.hours} label="Horas" />
            <TimeBlock value={timeUntil.minutes} label="Minutos" />
            <TimeBlock value={timeUntil.seconds} label="Segundos" />
          </div>
        </div>
      ) : (
        <p className="text-white/70 italic">
          Las sesiones de hoy han terminado. ¡Gracias por participar!
        </p>
      )}
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white/10 rounded-lg p-3 min-w-[70px]">
      <div className="text-3xl font-bold text-white">
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-xs text-white/60 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
