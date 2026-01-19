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

// Debounce helper for server sync
let syncTimeout: NodeJS.Timeout | null = null;
const SYNC_DEBOUNCE_MS = 500;

// Sync state to Vercel KV (debounced)
const syncToServer = async (state: {
  inventory: PrizeInventory;
  sessions: Session[];
  spinHistory: SpinRecord[];
  eventDay: 'saturday' | 'sunday' | null;
}) => {
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
    } catch (error) {
      console.error('Error syncing to server:', error);
    }
  }, SYNC_DEBOUNCE_MS);
};

// Load state from Vercel KV
const loadFromServer = async (): Promise<{
  inventory: PrizeInventory;
  sessions: Session[];
  spinHistory: SpinRecord[];
  eventDay: 'saturday' | 'sunday' | null;
} | null> => {
  try {
    const response = await fetch('/api/state');
    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
  } catch (error) {
    console.error('Error loading from server:', error);
  }
  return null;
};

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

  // Load from server (Vercel KV) - call this on initial page load
  loadFromServer: async () => {
    const serverState = await loadFromServer();
    if (serverState) {
      set({
        inventory: serverState.inventory || { ...INITIAL_INVENTORY },
        sessions: serverState.sessions || SESSIONS,
        spinHistory: serverState.spinHistory || [],
        eventDay: serverState.eventDay || null,
      });
      // Also update localStorage to keep them in sync
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverState));
        } catch (e) {
          console.error('Error updating localStorage from server:', e);
        }
      }
    }
  },

  saveState: () => {
    if (typeof window === 'undefined') return;

    const { inventory, sessions, spinHistory, eventDay } = get();
    const stateToSave = { inventory, sessions, spinHistory, eventDay };

    // Save to localStorage (fast, local)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Error saving state:', e);
    }

    // Sync to Vercel KV (debounced, persistent)
    syncToServer(stateToSave);
  },
}));
