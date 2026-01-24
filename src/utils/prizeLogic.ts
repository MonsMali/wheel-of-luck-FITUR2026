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

// Simple probability calculation based on remaining inventory
// Each prize has a probability proportional to its remaining count
export function calculateWeights(
  inventory: PrizeInventory
): Map<PrizeType, number> {
  const weights = new Map<PrizeType, number>();

  const totalRemaining = inventory.voucher + inventory.tasting + inventory.surprise;

  if (totalRemaining === 0) {
    weights.set('voucher', 0);
    weights.set('tasting', 0);
    weights.set('surprise', 0);
    return weights;
  }

  // Simple odds: probability proportional to remaining inventory
  // This naturally distributes prizes evenly over remaining spins
  // 6 vouchers / 1254 total = ~0.48% chance
  // 76 tastings / 1254 total = ~6.1% chance
  // 1172 surprises / 1254 total = ~93.5% chance

  weights.set('voucher', inventory.voucher > 0 ? inventory.voucher : 0);
  weights.set('tasting', inventory.tasting > 0 ? inventory.tasting : 0);
  weights.set('surprise', inventory.surprise > 0 ? inventory.surprise : 0);

  return weights;
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

  // Simple weighted random selection based on remaining inventory
  const weights = calculateWeights(inventory);

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
