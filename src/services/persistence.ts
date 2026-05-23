export interface PersistPayload<T> {
  userId: string;
  state: T;
}

export const keyFor = (userId: string) => `ecoplay.state.${userId}`;

export function clearState(userId: string) {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    // ignore
  }
}

export function loadState<T>(userId: string): T | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadStateWithDefaults<T>(userId: string, defaults: T): T {
  const raw = loadState<T>(userId);
  if (!raw) return defaults;
  return { ...defaults, ...raw };
}

export function saveState<T>({ userId, state }: PersistPayload<T>) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(state));
  } catch {
    // storage full or blocked
  }
}