import type { User, UserStats } from "@/types";

const KEY = "blackjack-tutor:user";

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
