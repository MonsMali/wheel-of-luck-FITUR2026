'use client';

import { useCallback, useRef, useEffect } from 'react';

type SoundType = 'spin' | 'win' | 'bigWin' | 'click' | 'tick';

// Sound URLs - using Web Audio API for generated sounds to avoid external dependencies
export function useSoundEffects() {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on mount
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, []);

  const playSound = useCallback((soundType: SoundType) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    switch (soundType) {
      case 'spin':
        // Rising whoosh sound
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            playTone(200 + i * 50, 0.15, 'sine', 0.1);
          }, i * 50);
        }
        break;

      case 'tick':
        // Quick tick sound
        playTone(800, 0.05, 'square', 0.15);
        break;

      case 'click':
        // Button click
        playTone(600, 0.08, 'sine', 0.2);
        break;

      case 'win':
        // Victory fanfare - simple ascending notes
        const winNotes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        winNotes.forEach((freq, i) => {
          setTimeout(() => {
            playTone(freq, 0.3, 'sine', 0.25);
          }, i * 150);
        });
        break;

      case 'bigWin':
        // Big win celebration - more elaborate
        const bigWinNotes = [
          { freq: 523.25, delay: 0 },     // C5
          { freq: 659.25, delay: 100 },   // E5
          { freq: 783.99, delay: 200 },   // G5
          { freq: 1046.50, delay: 300 },  // C6
          { freq: 1318.51, delay: 400 },  // E6
          { freq: 1567.98, delay: 500 },  // G6
          { freq: 2093.00, delay: 700 },  // C7
        ];
        bigWinNotes.forEach(({ freq, delay }) => {
          setTimeout(() => {
            playTone(freq, 0.4, 'sine', 0.2);
            playTone(freq * 0.5, 0.4, 'sine', 0.15); // Harmony
          }, delay);
        });
        break;
    }
  }, [playTone]);

  // Spinning sound effect that plays during wheel rotation
  const playSpinningSound = useCallback((duration: number = 5000) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Play ticking sounds that slow down
    let tickInterval = 50;
    let elapsed = 0;

    const tick = () => {
      if (elapsed < duration) {
        playSound('tick');

        // Gradually increase interval to simulate slowing down
        tickInterval = 50 + (elapsed / duration) * 450;
        elapsed += tickInterval;

        setTimeout(tick, tickInterval);
      }
    };

    tick();
  }, [playSound]);

  return {
    playSound,
    playSpinningSound,
  };
}
