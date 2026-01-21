import { Prize, PrizeInventory, PrizeType, Session } from '@/types';

export const PRIZES: Prize[] = [
  {
    id: 'voucher',
    type: 'voucher',
    displayName: 'Experiencia',
    color: '#FFD700', // Gold
    icon: '🎁',
    weight: 1,
  },
  {
    id: 'tasting',
    type: 'tasting',
    displayName: 'Saboreo',
    color: '#E85D04', // Orange (Algarve sunset)
    icon: '🍷',
    weight: 5,
  },
  {
    id: 'surprise',
    type: 'surprise',
    displayName: 'Regalos',
    color: '#0077B6', // Blue (Algarve ocean)
    icon: '🎉',
    weight: 15,
  },
];

// Calculate dynamic weights based on remaining inventory and session targets
// Target distribution: 9 vouchers, 83 tastings, 1298 surprises = 1390 total
// Voucher: ~0.65%, Tasting: ~6%, Surprise: ~93%
export function calculateWeights(
  inventory: PrizeInventory,
  currentSession: Session | null,
  totalRemainingSpins: number
): Map<PrizeType, number> {
  const weights = new Map<PrizeType, number>();

  // Base weights calibrated for correct distribution
  // Using 10000 as base for precision
  let voucherWeight = 0;
  let tastingWeight = 0;
  let surpriseWeight = 0;

  // Surprise: ~93% probability (base)
  if (inventory.surprise > 0) {
    surpriseWeight = 9300;
  }

  // Tasting: ~6% probability
  if (inventory.tasting > 0) {
    tastingWeight = 600;
  }

  // Voucher: ~0.5-1% probability, only when session needs them
  if (inventory.voucher > 0 && currentSession) {
    const remainingVouchersForSession = currentSession.targetVouchers - currentSession.vouchersAwarded;

    if (remainingVouchersForSession > 0) {
      // Very low base probability (~0.5%)
      // Slightly higher on Saturday since more vouchers are allocated
      voucherWeight = currentSession.day === 'saturday' ? 60 : 50;

      // If session really needs vouchers (running low), increase slightly
      if (remainingVouchersForSession > 0 && remainingVouchersForSession < currentSession.targetVouchers) {
        // Need to catch up, increase slightly
        voucherWeight = voucherWeight * 1.5;
      }

      // TIME-BASED BOOST: Increase probability as session time runs out
      const { multiplier } = getVoucherBoostMultiplier(currentSession, remainingVouchersForSession);
      voucherWeight = Math.min(voucherWeight * multiplier, 1500); // Cap at ~15% max probability
    }
  }

  weights.set('voucher', voucherWeight);
  weights.set('tasting', tastingWeight);
  weights.set('surprise', surpriseWeight);

  return weights;
}

// Expected spins per session (1390 total prizes / 8 sessions)
const EXPECTED_SPINS_PER_SESSION = 175;

// After this many spins without meeting voucher target, force a voucher
const VOUCHER_GUARANTEE_THRESHOLD = 0.75; // 75% of expected session spins

// Time-based thresholds for dynamic probability adjustment
const TIME_BOOST_THRESHOLD = 0.6;    // Start boosting at 60% of session time
const TIME_URGENT_THRESHOLD = 0.8;   // Urgent boost at 80% of session time
const TIME_FORCE_THRESHOLD = 0.9;    // Force voucher at 90% of session time

// Spain timezone offset from UTC (CET = UTC+1, CEST = UTC+2)
// FITUR 2026 is in January, so CET (UTC+1) applies
const SPAIN_TIMEZONE_OFFSET_HOURS = 1;

// Buffer for session start/end times (accounts for early starts or delays)
const SESSION_TIME_BUFFER_MINUTES = 5;

// Get current time in Spain
function getSpainTime(): Date {
  const now = new Date();
  // Get UTC time, then add Spain offset
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (SPAIN_TIMEZONE_OFFSET_HOURS * 3600000));
}

// Check if current day (in Spain time) matches the session day
function isCorrectDayForSession(session: Session): boolean {
  const spainNow = getSpainTime();
  const dayOfWeek = spainNow.getDay(); // 0 = Sunday, 6 = Saturday

  if (session.day === 'saturday' && dayOfWeek === 6) return true;
  if (session.day === 'sunday' && dayOfWeek === 0) return true;
  return false;
}

// Calculate how much of the session time has elapsed (0 to 1)
// Returns -1 if we're outside the session time window
function getSessionTimeProgress(session: Session): number {
  // First check if it's the correct day for this session
  if (!isCorrectDayForSession(session)) {
    return -1; // Not the right day, skip time-based adjustments
  }

  const spainNow = getSpainTime();
  const today = spainNow.toISOString().split('T')[0];

  const [startHour, startMin] = session.startTime.split(':').map(Number);
  const [endHour, endMin] = session.endTime.split(':').map(Number);

  // Create session times in Spain timezone
  const sessionStart = new Date(spainNow);
  sessionStart.setHours(startHour, startMin, 0, 0);

  const sessionEnd = new Date(spainNow);
  sessionEnd.setHours(endHour, endMin, 0, 0);

  // Add buffer for early starts / late ends
  const bufferMs = SESSION_TIME_BUFFER_MINUTES * 60 * 1000;
  const sessionStartWithBuffer = new Date(sessionStart.getTime() - bufferMs);
  const sessionEndWithBuffer = new Date(sessionEnd.getTime() + bufferMs);

  // If we're before the session starts or after it ends (with buffer), return -1
  if (spainNow < sessionStartWithBuffer || spainNow > sessionEndWithBuffer) {
    return -1;
  }

  const sessionDuration = sessionEnd.getTime() - sessionStart.getTime();
  const elapsed = spainNow.getTime() - sessionStart.getTime();

  return Math.max(0, Math.min(1, elapsed / sessionDuration));
}

// Calculate dynamic voucher probability boost based on time and need
function getVoucherBoostMultiplier(
  session: Session,
  vouchersNeeded: number
): { multiplier: number; forceVoucher: boolean } {
  const timeProgress = getSessionTimeProgress(session);

  // No vouchers needed, no boost
  if (vouchersNeeded <= 0) {
    return { multiplier: 1, forceVoucher: false };
  }

  // If we're outside session time window (-1), don't apply time-based adjustments
  // This happens when admin manually starts a session outside its scheduled hours
  if (timeProgress < 0) {
    return { multiplier: 1, forceVoucher: false };
  }

  // Force voucher if we're at 90%+ of session time and still need vouchers
  if (timeProgress >= TIME_FORCE_THRESHOLD) {
    console.log(`Time-based force: ${Math.round(timeProgress * 100)}% of session, need ${vouchersNeeded} vouchers`);
    return { multiplier: 1, forceVoucher: true };
  }

  // Urgent boost at 80%+ (5x probability)
  if (timeProgress >= TIME_URGENT_THRESHOLD) {
    const urgentMultiplier = 5 * vouchersNeeded;
    console.log(`Urgent boost: ${Math.round(timeProgress * 100)}% of session, ${urgentMultiplier}x multiplier`);
    return { multiplier: urgentMultiplier, forceVoucher: false };
  }

  // Normal boost at 60%+ (2x probability)
  if (timeProgress >= TIME_BOOST_THRESHOLD) {
    const boostMultiplier = 2 * vouchersNeeded;
    console.log(`Time boost: ${Math.round(timeProgress * 100)}% of session, ${boostMultiplier}x multiplier`);
    return { multiplier: boostMultiplier, forceVoucher: false };
  }

  return { multiplier: 1, forceVoucher: false };
}

export function selectPrize(
  inventory: PrizeInventory,
  currentSession: Session | null,
  sessionSpinCount: number = 0
): Prize | null {
  const totalRemaining = inventory.voucher + inventory.tasting + inventory.surprise;

  if (totalRemaining === 0) {
    return null;
  }

  // GUARANTEE MECHANISM: Force voucher if session needs it and we're running low on time/spins
  if (currentSession && inventory.voucher > 0) {
    const vouchersNeeded = currentSession.targetVouchers - currentSession.vouchersAwarded;

    if (vouchersNeeded > 0) {
      // TIME-BASED CHECK: Force voucher if session time is almost up
      const { forceVoucher } = getVoucherBoostMultiplier(currentSession, vouchersNeeded);
      if (forceVoucher) {
        return PRIZES.find(p => p.type === 'voucher')!;
      }

      // SPIN-BASED CHECK: Force voucher if we've had many spins without meeting target
      // Calculate threshold based on how many vouchers still needed
      // If we need 2 vouchers, first should come by 50% mark, second by 75%
      const thresholdPerVoucher = EXPECTED_SPINS_PER_SESSION * VOUCHER_GUARANTEE_THRESHOLD / currentSession.targetVouchers;
      const spinThreshold = thresholdPerVoucher * (currentSession.targetVouchers - vouchersNeeded + 1);

      // Force a voucher if we've passed the threshold
      if (sessionSpinCount >= spinThreshold) {
        console.log(`Spin-based force: spin ${sessionSpinCount}, threshold ${spinThreshold}, needed ${vouchersNeeded}`);
        return PRIZES.find(p => p.type === 'voucher')!;
      }
    }
  }

  const weights = calculateWeights(inventory, currentSession, totalRemaining);

  // Calculate total weight
  let totalWeight = 0;
  weights.forEach((weight, type) => {
    if (inventory[type] > 0) {
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) {
    return null;
  }

  // Random selection
  let random = Math.random() * totalWeight;

  for (const prize of PRIZES) {
    const weight = weights.get(prize.type) || 0;
    if (inventory[prize.type] > 0 && weight > 0) {
      random -= weight;
      if (random <= 0) {
        return prize;
      }
    }
  }

  // Fallback to first available prize
  for (const prize of PRIZES) {
    if (inventory[prize.type] > 0) {
      return prize;
    }
  }

  return null;
}

export function getWinMessage(prizeType: PrizeType): string {
  switch (prizeType) {
    case 'voucher':
      return '¡Enhorabuena! Has ganado un Vale de Algarve.';
    case 'tasting':
      return '¡Enhorabuena! Has ganado una Degustación en Algarve.';
    case 'surprise':
      return '¡Enhorabuena! Has ganado un Premio sorpresa de Algarve.';
    default:
      return '¡Enhorabuena! Has ganado:';
  }
}

// Get wheel segments for visual display
// Goal: Distribute good prizes (experiencia, saboreo) across sessions
// Leftovers should mostly be regalos
// 16 slices: 12 regalos (75%), 3 saboreo (18.75%), 1 experiencia (6.25%)
export function getWheelSegments(): { prize: Prize; angle: number }[] {
  const segments: { prize: Prize; angle: number }[] = [];

  // Evenly distributed - special prizes every 4 slices
  const pattern: PrizeType[] = [
    'tasting',   // 0  - orange
    'surprise',  // 1  - blue
    'surprise',  // 2  - blue
    'surprise',  // 3  - blue
    'tasting',   // 4  - orange
    'surprise',  // 5  - blue
    'surprise',  // 6  - blue
    'surprise',  // 7  - blue
    'voucher',   // 8  - GOLD (the jackpot!)
    'surprise',  // 9  - blue
    'surprise',  // 10 - blue
    'surprise',  // 11 - blue
    'tasting',   // 12 - orange
    'surprise',  // 13 - blue
    'surprise',  // 14 - blue
    'surprise',  // 15 - blue
  ];

  const segmentAngle = 360 / pattern.length;

  pattern.forEach((type) => {
    const prize = PRIZES.find(p => p.type === type)!;
    segments.push({
      prize,
      angle: segmentAngle,
    });
  });

  return segments;
}

// Calculate statistics for admin dashboard
export function calculateStatistics(
  inventory: PrizeInventory,
  initialInventory: PrizeInventory
): { type: PrizeType; awarded: number; remaining: number; percentage: number }[] {
  return PRIZES.map(prize => {
    const awarded = initialInventory[prize.type] - inventory[prize.type];
    const remaining = inventory[prize.type];
    const percentage = initialInventory[prize.type] > 0
      ? Math.round((awarded / initialInventory[prize.type]) * 100)
      : 0;

    return {
      type: prize.type,
      awarded,
      remaining,
      percentage,
    };
  });
}
