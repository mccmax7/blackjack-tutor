import type { GameState, User, UserStats } from "@/types";

const KEY = "blackjack-tutor:user";
const GAME_KEY = "blackjack-tutor:game";

export const STARTING_BUDGET = 1000;

export function emptyStats(): UserStats {
  return {
    handsPlayed: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    blackjacks: 0,
  };
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<User>;
    if (
      !parsed ||
      typeof parsed.name !== "string" ||
      typeof parsed.email !== "string"
    ) {
      return null;
    }
    // Migrate older records without budget/stats.
    const user: User = {
      name: parsed.name,
      email: parsed.email,
      budget:
        typeof parsed.budget === "number" && Number.isFinite(parsed.budget)
          ? parsed.budget
          : STARTING_BUDGET,
      stats: { ...emptyStats(), ...(parsed.stats ?? {}) },
    };
    return user;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function getGameState(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (
      !parsed ||
      !Array.isArray(parsed.deck) ||
      !Array.isArray(parsed.hands) ||
      !Array.isArray(parsed.dealer) ||
      typeof parsed.activeHandIndex !== "number" ||
      typeof parsed.bet !== "number" ||
      typeof parsed.holeHidden !== "boolean" ||
      typeof parsed.status !== "string"
    ) {
      return null;
    }
    // Validate each hand has the right shape (best-effort)
    for (const h of parsed.hands) {
      if (
        !h ||
        !Array.isArray(h.cards) ||
        typeof h.bet !== "number" ||
        typeof h.status !== "string"
      ) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setGameState(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GAME_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded — fine to ignore for MVP
  }
}

export function clearGameState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GAME_KEY);
}
