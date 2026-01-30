'use client';

import { create } from 'zustand';
import { GameStore, PrizeInventory, PrizeType, Session, SpinRecord } from '@/types';

const ADMIN_PIN = 'FITUR2026'; // Staff access PIN

// Final 2 sessions (Sunday 15:00 and 16:00): ~331 spins expected (165.5 per session)
// 3 experiencias left (need max 2 per session to award all)
// 24 saboreos left
// 241 regalos left
// Total: 268 prizes for ~331 spins (prizes will run out before spins end)
const INITIAL_INVENTORY: PrizeInventory = {
  voucher: 70,
  tasting: 150,
  surprise: 400,
};

// Final 2 Sunday sessions: 15:00 and 16:00 (45 min each)
// Expected ~165.5 spins per session = ~331 total
const SESSIONS: Session[] = [
  // Saturday sessions (completed)
  { id: 'sat-11', day: 'saturday', startTime: '11:00', endTime: '12:00', durationMinutes: 60, isActive: false, targetVouchers: 0, vouchersAwarded: 3, actualEndTime: '2026-01-24T11:00:00.000Z' },
  { id: 'sat-13', day: 'saturday', startTime: '13:00', endTime: '14:00', durationMinutes: 60, isActive: false, targetVouchers: 0, vouchersAwarded: 1, actualEndTime: '2026-01-24T13:00:00.000Z' },
  { id: 'sat-16', day: 'saturday', startTime: '16:00', endTime: '17:00', durationMinutes: 60, isActive: false, targetVouchers: 0, vouchersAwarded: 0, actualEndTime: '2026-01-25T16:00:00.000Z' },
  { id: 'sat-18', day: 'saturday', startTime: '18:00', endTime: '19:00', durationMinutes: 60, isActive: false, targetVouchers: 0, vouchersAwarded: 0, actualEndTime: '2026-01-25T18:00:00.000Z' },
  // Sunday sessions (first 2 completed, last 2 remaining)
  { id: 'sun-11', day: 'sunday', startTime: '11:00', endTime: '11:45', durationMinutes: 45, isActive: false, targetVouchers: 0, vouchersAwarded: 0, actualEndTime: '2026-01-26T11:00:00.000Z' },
  { id: 'sun-13', day: 'sunday', startTime: '13:00', endTime: '13:45', durationMinutes: 45, isActive: false, targetVouchers: 0, vouchersAwarded: 0, actualEndTime: '2026-01-26T13:00:00.000Z' },
  { id: 'sun-15', day: 'sunday', startTime: '15:00', endTime: '15:45', durationMinutes: 45, isActive: false, targetVouchers: 0, vouchersAwarded: 0 },
  { id: 'sun-16', day: 'sunday', startTime: '16:00', endTime: '16:45', durationMinutes: 45, isActive: false, targetVouchers: 0, vouchersAwarded: 0 },
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

  // Sync session configuration (times, duration) from code WITHOUT losing runtime state
  // This preserves: vouchersAwarded, isActive, actualStartTime, actualEndTime
  syncSessionConfig: () => {
    set((state) => ({
      sessions: SESSIONS.map((defaultSession) => {
        // Find the existing session state
        const existingSession = state.sessions.find(s => s.id === defaultSession.id);
        if (existingSession) {
          // Merge: use new config (times, duration) but keep runtime state
          return {
            ...defaultSession,
            isActive: existingSession.isActive,
            vouchersAwarded: existingSession.vouchersAwarded,
            actualStartTime: existingSession.actualStartTime,
            actualEndTime: existingSession.actualEndTime,
          };
        }
        return defaultSession;
      }),
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
