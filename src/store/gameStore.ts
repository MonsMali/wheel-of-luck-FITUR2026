'use client';

import { create } from 'zustand';
import { GameStore, PrizeInventory, PrizeType, Session, SpinRecord } from '@/types';

const ADMIN_PIN = 'FITUR2026'; // Staff access PIN

const INITIAL_INVENTORY: PrizeInventory = {
  voucher: 9,
  tasting: 83,
  surprise: 1298,
};

const SESSIONS: Session[] = [
  // Saturday sessions
  { id: 'sat-11', day: 'saturday', startTime: '11:00', endTime: '12:00', isActive: true, targetVouchers: 2, vouchersAwarded: 0 },
  { id: 'sat-13', day: 'saturday', startTime: '13:00', endTime: '14:00', isActive: false, targetVouchers: 1, vouchersAwarded: 0 },
  { id: 'sat-16', day: 'saturday', startTime: '16:00', endTime: '17:00', isActive: false, targetVouchers: 1, vouchersAwarded: 0 },
  { id: 'sat-18', day: 'saturday', startTime: '18:00', endTime: '19:00', isActive: false, targetVouchers: 1, vouchersAwarded: 0 },
  // Sunday sessions
  { id: 'sun-11', day: 'sunday', startTime: '11:00', endTime: '12:00', isActive: false, targetVouchers: 1, vouchersAwarded: 0 },
  { id: 'sun-13', day: 'sunday', startTime: '13:00', endTime: '14:00', isActive: false, targetVouchers: 1, vouchersAwarded: 0 },
  { id: 'sun-16', day: 'sunday', startTime: '16:00', endTime: '17:00', isActive: false, targetVouchers: 1, vouchersAwarded: 0 },
  { id: 'sun-17', day: 'sunday', startTime: '17:00', endTime: '18:00', isActive: false, targetVouchers: 1, vouchersAwarded: 0 },
];

const STORAGE_KEY = 'ruleta-algarve-state';

export const useGameStore = create<GameStore>((set, get) => ({
  inventory: { ...INITIAL_INVENTORY },
  initialInventory: { ...INITIAL_INVENTORY },
  sessions: SESSIONS,
  currentSession: null,
  spinHistory: [],
  isSpinning: false,
  lastWin: null,
  showWinModal: false,
  adminAuthenticated: false,
  eventDay: null,

  setInventory: (inventory) => {
    set({ inventory });
    get().saveState();
  },

  decrementPrize: (type) => {
    const { inventory } = get();
    if (inventory[type] > 0) {
      set({
        inventory: {
          ...inventory,
          [type]: inventory[type] - 1,
        },
      });
      get().saveState();
    }
  },

  setCurrentSession: (session) => set({ currentSession: session }),

  startSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, isActive: true } : s
      ),
      currentSession: state.sessions.find((s) => s.id === sessionId) || null,
    }));
    get().saveState();
  },

  endSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, isActive: false } : s
      ),
      currentSession: null,
    }));
    get().saveState();
  },

  setIsSpinning: (spinning) => set({ isSpinning: spinning }),

  setLastWin: (prize) => set({ lastWin: prize }),

  setShowWinModal: (show) => set({ showWinModal: show }),

  addSpinRecord: (record) => {
    set((state) => ({
      spinHistory: [...state.spinHistory, record],
    }));
    get().saveState();
  },

  authenticateAdmin: (pin) => {
    const isValid = pin === ADMIN_PIN;
    if (isValid) {
      set({ adminAuthenticated: true });
    }
    return isValid;
  },

  logoutAdmin: () => set({ adminAuthenticated: false }),

  setEventDay: (day) => {
    set({ eventDay: day });
    get().saveState();
  },

  resetInventory: () => {
    set({
      inventory: { ...INITIAL_INVENTORY },
      sessions: SESSIONS.map((s) => ({ ...s, isActive: false, vouchersAwarded: 0 })),
      spinHistory: [],
      currentSession: null,
    });
    get().saveState();
  },

  incrementSessionVoucher: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, vouchersAwarded: s.vouchersAwarded + 1 } : s
      ),
    }));
    get().saveState();
  },

  adjustInventory: (type, amount) => {
    const { inventory } = get();
    const newAmount = Math.max(0, inventory[type] + amount);
    set({
      inventory: {
        ...inventory,
        [type]: newAmount,
      },
    });
    get().saveState();
  },

  loadState: () => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        set({
          inventory: parsed.inventory || { ...INITIAL_INVENTORY },
          sessions: parsed.sessions || SESSIONS,
          spinHistory: parsed.spinHistory || [],
          eventDay: parsed.eventDay || null,
        });
      }
    } catch (e) {
      console.error('Error loading state:', e);
    }
  },

  saveState: () => {
    if (typeof window === 'undefined') return;

    const { inventory, sessions, spinHistory, eventDay } = get();
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          inventory,
          sessions,
          spinHistory,
          eventDay,
        })
      );
    } catch (e) {
      console.error('Error saving state:', e);
    }
  },
}));
