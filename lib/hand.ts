import type { Card } from "@/types";
import { cardValue } from "./deck";

export interface HandTotal {
  total: number;
  isSoft: boolean;
}

export function handTotal(cards: Card[]): HandTotal {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === "A") aces += 1;
  }
  // Downgrade aces from 11 to 1 while busting.
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  // Soft if at least one ace is still counted as 11.
  return { total, isSoft: aces > 0 && total <= 21 };
}

export function isBlackjack(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  return handTotal(cards).total === 21;
}

export function isBust(cards: Card[]): boolean {
  return handTotal(cards).total > 21;
}
