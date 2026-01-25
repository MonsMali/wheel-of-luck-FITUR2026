export type PrizeType = 'voucher' | 'tasting' | 'surprise';

export interface Prize {
  id: string;
  type: PrizeType;
  displayName: string;
  color: string;
  icon: string;
  weight: number;
}

export interface PrizeInventory {
  voucher: number;
  tasting: number;
  surprise: number;
}

export interface Session {
  id: string;
  day: 'saturday' | 'sunday';
  startTime: string; // HH:MM format (scheduled)
  endTime: string;   // HH:MM format (scheduled)
  durationMinutes: number; // Session duration in minutes (60 for Saturday, 45 for Sunday)
  isActive: boolean;
  targetVouchers: number;
  vouchersAwarded: number;
  // Actual timing (set when session is started/ended)
  actualStartTime?: string; // ISO timestamp when admin started the session
  actualEndTime?: string;   // ISO timestamp when session ended (auto or manual)
}

export interface SpinRecord {
  id: string;
  timestamp: string;
  sessionId: string;
  prizeType: PrizeType;
  prizeDisplayName: string;
}

export interface GameState {
  inventory: PrizeInventory;
  initialInventory: PrizeInventory;
  sessions: Session[];
  currentSession: Session | null;
  spinHistory: SpinRecord[];
  isSpinning: boolean;
  lastWin: Prize | null;
  showWinModal: boolean;
  adminAuthenticated: boolean;
  eventDay: 'saturday' | 'sunday' | null;
}

export interface GameStore extends GameState {
  // Actions
  setInventory: (inventory: PrizeInventory) => void;
  decrementPrize: (type: PrizeType) => void;
  setCurrentSession: (session: Session | null) => void;
  startSession: (sessionId: string) => void;
  endSession: (sessionId: string) => void;
  setIsSpinning: (spinning: boolean) => void;
  setLastWin: (prize: Prize | null) => void;
  setShowWinModal: (show: boolean) => void;
  addSpinRecord: (record: SpinRecord) => void;
  authenticateAdmin: (pin: string) => boolean;
  logoutAdmin: () => void;
  setEventDay: (day: 'saturday' | 'sunday') => void;
  resetInventory: () => void;
  loadState: () => void;
  loadFromServer: () => Promise<void>;
  saveState: () => void;
  incrementSessionVoucher: (sessionId: string) => void;
  adjustInventory: (type: PrizeType, amount: number) => void;
  restartSession: (sessionId: string) => void;
}
