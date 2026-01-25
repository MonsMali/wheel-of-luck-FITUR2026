'use client';

import { create } from 'zustand';
import { GameStore, PrizeInventory, PrizeType, Session, SpinRecord } from '@/types';

const ADMIN_PIN = 'FITUR2026'; // Staff access PIN

// Updated after session 2 (sat-13): 369 total spins so far
// 5 experiencias left for 6 remaining sessions (max 1 per session)
// 68 saboreos left
// 949 regalos left
// Total: 1022 prizes for 6 remaining sessions (~170 spins/session expected)
const INITIAL_INVENTORY: PrizeInventory = {
  voucher: 5,
  tasting: 68,
  surprise: 949,
};

// Sessions 1-2 done (sat-11, sat-13): 369 total spins
// sat-11: 3 experiencias, 7 saboreo, 126 regalos (136 spins)
// sat-13: 1 experiencia, 8 saboreo, 223 regalos (232 spins)
// 6 sessions remaining
// Sunday sessions are 45 minutes, Saturday sessions are 60 minutes
const SESSIONS: Session[] = [
  // Saturday sessions (60 min each) - first two already completed
  { id: 'sat-11', day: 'saturday', startTime: '11:00', endTime: '12:00', durationMinutes: 60, isActive: false, targetVouchers: 0, vouchersAwarded: 3, actualEndTime: '2026-01-24T11:00:00.000Z' },
  { id: 'sat-13', day: 'saturday', startTime: '13:00', endTime: '14:00', durationMinutes: 60, isActive: false, targetVouchers: 0, vouchersAwarded: 1, actualEndTime: '2026-01-24T13:00:00.000Z' },
  { id: 'sat-16', day: 'saturday', startTime: '16:00', endTime: '17:00', durationMinutes: 60, isActive: false, targetVouchers: 0, vouchersAwarded: 0 },
  { id: 'sat-18', day: 'saturday', startTime: '18:00', endTime: '19:00', durationMinutes: 60, isActive: false, targetVouchers: 0, vouchersAwarded: 0 },
  // Sunday sessions (45 min each)
  { id: 'sun-11', day: 'sunday', startTime: '11:00', endTime: '11:45', durationMinutes: 45, isActive: false, targetVouchers: 0, vouchersAwarded: 0 },
  { id: 'sun-13', day: 'sunday', startTime: '13:00', endTime: '13:45', durationMinutes: 45, isActive: false, targetVouchers: 0, vouchersAwarded: 0 },
  { id: 'sun-16', day: 'sunday', startTime: '16:00', endTime: '16:45', durationMinutes: 45, isActive: false, targetVouchers: 0, vouchersAwarded: 0 },
  { id: 'sun-17', day: 'sunday', startTime: '17:00', endTime: '17:45', durationMinutes: 45, isActive: false, targetVouchers: 0, vouchersAwarded: 0 },
];

const STORAGE_KEY = 'ruleta-algarve-state';

// Track if we're currently saving to prevent load overwriting save
let isSaving = false;
let savePromise: Promise<void> | null = null;

// Sync state to Vercel KV (immediate, not debounced - we need consistency)
const syncToServer = async (state: {
  inventory: PrizeInventory;
  sessions: Session[];
  spinHistory: SpinRecord[];
  eventDay: 'saturday' | 'sunday' | null;
}): Promise<void> => {
  isSaving = true;
  try {
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
  } catch (error) {
    console.error('Error syncing to server:', error);
  } finally {
    isSaving = false;
  }
};

// Load state from Vercel KV
const fetchFromServer = async (): Promise<{
  inventory: PrizeInventory;
  sessions: Session[];
  spinHistory: SpinRecord[];
  eventDay: 'saturday' | 'sunday' | null;
} | null> => {
  // Don't load while saving - would cause race condition
  if (isSaving) {
    return null;
  }

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
    const session = get().sessions.find((s) => s.id === sessionId);

    // Prevent restarting a used session
    if (session?.actualEndTime) {
      console.warn(`Session ${sessionId} already used, cannot restart`);
      return;
    }

    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, isActive: true, actualStartTime: new Date().toISOString() }
          : s
      ),
      currentSession: state.sessions.find((s) => s.id === sessionId) || null,
    }));
    get().saveState();
  },

  endSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, isActive: false, actualEndTime: new Date().toISOString() }
          : s
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

  // Emergency restart: allows restarting a session that was accidentally ended
  restartSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, isActive: true, actualEndTime: undefined, actualStartTime: new Date().toISOString() }
          : s
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

  // Load from server (Vercel KV) - call this on initial page load only
  loadFromServer: async () => {
    const serverState = await fetchFromServer();
    if (!serverState) return;

    const currentState = get();

    // Only update from server if server has MORE data (more spins = more recent)
    // This prevents overwriting local state with stale server data
    const serverSpins = serverState.spinHistory?.length || 0;
    const localSpins = currentState.spinHistory?.length || 0;

    if (serverSpins >= localSpins) {
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

    // Sync to Vercel KV immediately (no debounce - need consistency)
    savePromise = syncToServer(stateToSave);
  },
}));
