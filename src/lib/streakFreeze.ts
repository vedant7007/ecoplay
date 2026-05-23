export type StreakEvent = 'streak_increased' | 'freeze_protected' | 'streak_reset' | 'duplicate' | 'none';

export interface StreakState {
  streak_count: number;
  last_streak_date: string | null;
  streak_freeze_count: number;
  last_freeze_reset_at: string | null;
}

export interface StreakTransitionResult {
  nextState: StreakState;
  event: StreakEvent;
}

export const STREAK_FREEZE_CAP = 1;
export const STREAK_FREEZE_RESET_DAYS = 7;

export function createStreakState(): StreakState {
  const today = getTodayKey();
  return {
    streak_count: 0,
    last_streak_date: null,
    streak_freeze_count: STREAK_FREEZE_CAP,
    last_freeze_reset_at: today,
  };
}

export function normalizeStreakState(state?: Partial<StreakState> | null): StreakState {
  const next = createStreakState();
  if (!state) return next;

  return {
    streak_count: Math.max(0, state.streak_count ?? 0),
    last_streak_date: state.last_streak_date ?? null,
    streak_freeze_count: Math.max(0, Math.min(STREAK_FREEZE_CAP, state.streak_freeze_count ?? next.streak_freeze_count)),
    last_freeze_reset_at: state.last_freeze_reset_at ?? next.last_freeze_reset_at,
  };
}

export function getTodayKey(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function ensureWeeklyFreezeReset(state: StreakState, date = new Date()): StreakState {
  const today = getTodayKey(date);
  const lastReset = state.last_freeze_reset_at ?? today;
  const daysSinceReset = daysBetween(lastReset, today);

  if (daysSinceReset >= STREAK_FREEZE_RESET_DAYS) {
    return {
      ...state,
      streak_freeze_count: STREAK_FREEZE_CAP,
      last_freeze_reset_at: today,
    };
  }

  return {
    ...state,
    streak_freeze_count: Math.max(0, Math.min(STREAK_FREEZE_CAP, state.streak_freeze_count ?? 0)),
    last_freeze_reset_at: lastReset,
  };
}

export function applyMissedDayProtection(state: StreakState, date = new Date()): StreakTransitionResult {
  const refreshed = ensureWeeklyFreezeReset(state, date);
  const today = getTodayKey(date);

  if (!refreshed.last_streak_date || refreshed.last_streak_date === today) {
    return { nextState: refreshed, event: 'none' };
  }

  const gap = daysBetween(refreshed.last_streak_date, today);
  if (gap <= 1) {
    return { nextState: refreshed, event: 'none' };
  }

  if (refreshed.streak_freeze_count > 0) {
    return {
      nextState: {
        ...refreshed,
        streak_freeze_count: refreshed.streak_freeze_count - 1,
        last_streak_date: today,
      },
      event: 'freeze_protected',
    };
  }

  return {
    nextState: {
      ...refreshed,
      streak_count: 0,
      last_streak_date: today,
    },
    event: 'streak_reset',
  };
}

export function applyChallengeCompletion(state: StreakState, date = new Date()): StreakTransitionResult {
  const refreshed = ensureWeeklyFreezeReset(state, date);
  const today = getTodayKey(date);

  if (refreshed.last_streak_date === today) {
    return { nextState: refreshed, event: 'duplicate' };
  }

  if (!refreshed.last_streak_date) {
    return {
      nextState: {
        ...refreshed,
        streak_count: 1,
        last_streak_date: today,
      },
      event: 'streak_increased',
    };
  }

  const gap = daysBetween(refreshed.last_streak_date, today);

  if (gap === 1) {
    return {
      nextState: {
        ...refreshed,
        streak_count: refreshed.streak_count + 1,
        last_streak_date: today,
      },
      event: 'streak_increased',
    };
  }

  if (gap > 1 && refreshed.streak_freeze_count > 0) {
    return {
      nextState: {
        ...refreshed,
        streak_freeze_count: refreshed.streak_freeze_count - 1,
        last_streak_date: today,
      },
      event: 'freeze_protected',
    };
  }

  return {
    nextState: {
      ...refreshed,
      streak_count: 0,
      last_streak_date: today,
    },
    event: 'streak_reset',
  };
}

export function getStreakNotification(event: StreakEvent): string | null {
  switch (event) {
    case 'streak_increased':
      return '🔥 Streak increased!';
    case 'freeze_protected':
      return '🌱 Eco Streak Freeze protected your streak!';
    case 'streak_reset':
      return '⚠️ Your streak has been reset.';
    default:
      return null;
  }
}
