import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { PrizeInventory, Session, SpinRecord } from '@/types';

// Initialize Redis from environment variables
const redis = Redis.fromEnv();

const STATE_KEY = 'ruleta-algarve-state';

export interface PersistedState {
  inventory: PrizeInventory;
  sessions: Session[];
  spinHistory: SpinRecord[];
  eventDay: 'saturday' | 'sunday' | null;
}

export async function GET() {
  try {
    const state = await redis.get<PersistedState>(STATE_KEY);
    return NextResponse.json({ success: true, data: state });
  } catch (error) {
    console.error('Error loading state from Redis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load state' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: PersistedState = await request.json();

    // Validate the data structure
    if (!body.inventory || !body.sessions || !body.spinHistory) {
      return NextResponse.json(
        { success: false, error: 'Invalid state structure' },
        { status: 400 }
      );
    }

    await redis.set(STATE_KEY, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving state to Redis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save state' },
      { status: 500 }
    );
  }
}
