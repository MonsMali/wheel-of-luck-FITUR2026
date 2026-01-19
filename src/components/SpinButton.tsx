'use client';

import React from 'react';

interface SpinButtonProps {
  onClick: () => void;
  disabled: boolean;
  isSpinning: boolean;
}

export default function SpinButton({ onClick, disabled, isSpinning }: SpinButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isSpinning}
      className={`
        relative px-12 py-5 rounded-full text-2xl font-bold
        transition-all duration-300 transform touch-manipulation
        ${disabled || isSpinning
          ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
          : 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white hover:scale-110 hover:shadow-2xl active:scale-95'}
        shadow-lg select-none
      `}
    >
      {/* Glow effect */}
      {!disabled && !isSpinning && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 blur-lg opacity-50 animate-pulse" />
      )}

      <span className="relative z-10 tracking-wider">
        {isSpinning ? 'GIRANDO...' : 'GIRAR'}
      </span>

      {/* Shine effect */}
      {!disabled && !isSpinning && (
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shine"
            style={{ animationDuration: '3s' }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        .animate-shine {
          animation: shine 3s infinite;
        }
      `}</style>
    </button>
  );
}
