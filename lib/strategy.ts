import type { Card, TutorAdvice } from "@/types";
import { cardValue } from "./deck";
import { handTotal } from "./hand";

/**
 * Returns Hit/Stand advice for the current hand using basic strategy
 * restricted to the two-action MVP (no double, split, surrender).
 *
 * Swap point for a real LLM: keep the signature, replace the body with
 * `await fetch('/api/tutor', …)` returning the same shape.
 */
export function basicStrategyAdvice(
  player: Card[],
  dealerUp: Card,
): TutorAdvice {
  const { total, isSoft } = handTotal(player);
  // Dealer up-card value: Ace counts as 11 here (matches strategy charts).
  const up = cardValue(dealerUp);

  if (isSoft) return softAdvice(total, up, dealerUp);
  return hardAdvice(total, up, dealerUp);
}

function hardAdvice(total: number, up: number, dealerUp: Card): TutorAdvice {
  if (total <= 11) {
    return {
      action: "Hit",
      reason: `You can't bust at ${total}. Always take a card on hard 11 or below.`,
    };
  }
  if (total >= 17) {
    return {
      action: "Stand",
      reason: `Hard ${total} is a strong total. Hitting risks busting; let the dealer chase you.`,
    };
  }
  // 12–16
  if (total === 12) {
    if (up >= 4 && up <= 6) {
      return {
        action: "Stand",
        reason: `Dealer's ${labelUp(dealerUp)} is a bust card. With 12 you only stand on 4–6 — let them break.`,
      };
    }
    return {
      action: "Hit",
      reason: `12 vs dealer ${labelUp(dealerUp)}: standing is too risky when the dealer is likely to make a strong total.`,
    };
  }
  // 13–16
  if (up >= 2 && up <= 6) {
    return {
      action: "Stand",
      reason: `Dealer's ${labelUp(dealerUp)} is weak (likely to bust). Don't risk your ${total} — make them draw.`,
    };
  }
  return {
    action: "Hit",
    reason: `${total} loses to most dealer made hands when their up-card is ${labelUp(dealerUp)}. You have to take the risk.`,
  };
}

function softAdvice(total: number, up: number, dealerUp: Card): TutorAdvice {
  // Soft total = at least one ace counted as 11.
  if (total >= 19) {
    return {
      action: "Stand",
      reason: `Soft ${total} is already a strong made hand — no upside in hitting.`,
    };
  }
  if (total === 18) {
    if (up >= 9 || dealerUp.rank === "A") {
      return {
        action: "Hit",
        reason: `Soft 18 vs dealer ${labelUp(dealerUp)}: dealer is likely to beat 18. The ace protects you, so improve.`,
      };
    }
    return {
      action: "Stand",
      reason: `Soft 18 vs dealer ${labelUp(dealerUp)}: 18 should win or push often enough — don't risk turning the ace into 1.`,
    };
  }
  // Soft 17 (A,6) or lower — always hit. The ace gives you a free draw.
  return {
    action: "Hit",
    reason: `Soft ${total} can't bust on the next card. Always take the free draw.`,
  };
}

function labelUp(c: Card): string {
  if (c.rank === "A") return "Ace";
  return c.rank;
}
