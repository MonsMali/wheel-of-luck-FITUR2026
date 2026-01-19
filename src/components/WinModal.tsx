'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Prize } from '@/types';
import { getWinMessage } from '@/utils/prizeLogic';
import { getRandomFact } from '@/utils/algarveFacts';

interface WinModalProps {
  prize: Prize;
  isOpen: boolean;
  onClose: () => void;
}

export default function WinModal({ prize, isOpen, onClose }: WinModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<ReturnType<typeof import('canvas-confetti').create> | null>(null);
  const [fact, setFact] = useState('');

  // Set a random fact when modal opens
  useEffect(() => {
    if (isOpen) {
      setFact(getRandomFact());
    }
  }, [isOpen]);

  useEffect(() => {
    // Respect user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isOpen && canvasRef.current && !prefersReducedMotion) {
      import('canvas-confetti').then((confettiModule) => {
        const confetti = confettiModule.create(canvasRef.current!, {
          resize: true,
          useWorker: true,
        });
        confettiRef.current = confetti;

        // Launch confetti based on prize type
        if (prize.type === 'voucher') {
          // Gold confetti for voucher
          const duration = 4000;
          const end = Date.now() + duration;

          const frame = () => {
            confetti({
              particleCount: 3,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.7 },
              colors: ['#FFD700', '#FFA500', '#FF6347'],
            });
            confetti({
              particleCount: 3,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.7 },
              colors: ['#FFD700', '#FFA500', '#FF6347'],
            });

            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          };
          frame();
        } else if (prize.type === 'tasting') {
          // Orange confetti for tasting
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#E85D04', '#F48C06', '#FAA307'],
          });
        } else {
          // Standard confetti for surprise
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#0077B6', '#00B4D8', '#90E0EF'],
          });
        }
      });
    }

    return () => {
      if (confettiRef.current) {
        confettiRef.current.reset();
      }
    };
  }, [isOpen, prize]);

  if (!isOpen) return null;

  const isVoucher = prize.type === 'voucher';
  const bgGradient = isVoucher
    ? 'from-yellow-500 via-orange-500 to-red-500'
    : prize.type === 'tasting'
      ? 'from-orange-500 to-amber-600'
      : 'from-blue-500 to-cyan-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Modal */}
      <div
        className={`
          relative z-50 mx-4 p-8 rounded-3xl shadow-2xl
          bg-gradient-to-br ${bgGradient}
          transform animate-bounce-in
          max-w-md w-full text-center
        `}
      >
        {/* Glow effect for voucher */}
        {isVoucher && (
          <div className="absolute inset-0 rounded-3xl animate-pulse bg-yellow-400/30 blur-xl" />
        )}

        <div className="relative">
          {/* Icon */}
          <div className="text-7xl mb-4 animate-bounce">
            {prize.icon}
          </div>

          {/* Win message */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 drop-shadow-lg">
            {getWinMessage(prize.type)}
          </h2>

          {/* Prize name */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl py-3 px-6 mb-6">
            <span className="text-xl font-semibold text-white">
              {prize.displayName}
            </span>
          </div>

          {/* Instructions */}
          <p className="text-white/90 mb-4 text-sm">
            {isVoucher
              ? 'Muestra esta pantalla al personal para reclamar tu premio.'
              : 'Acércate al stand para recibir tu regalo.'}
          </p>

          {/* Algarve Fun Fact */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl py-3 px-4 mb-6">
            <p className="text-white/70 text-xs uppercase tracking-wider mb-1">
              ¿Sabías que...?
            </p>
            <p className="text-white text-sm italic">
              {fact}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className={`
              px-8 py-3 rounded-full font-bold text-lg
              transition-all transform hover:scale-105
              ${isVoucher
                ? 'bg-white text-orange-600 hover:bg-yellow-100'
                : 'bg-white/90 text-gray-800 hover:bg-white'}
              shadow-lg
            `}
          >
            Listo
          </button>
        </div>
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
