import type { Card, TutorAdvice } from "@/types";
import { cardValue } from "./deck";
import { handTotal } from "./hand";

export interface AdviceContext {
  canDouble: boolean;
  canSplit: boolean;
}

/**
 * Basic-strategy advice for the current hand. Returns Hit / Stand / Double / Split.
 *
 * Caller passes legality flags so the tutor never recommends an illegal action
 * (e.g. Double after a hit, Split when bankroll is short). When omitted both
 * default to false — the chart degrades to Hit/Stand, matching the original
 * MVP behavior.
 *
 * Swap point for an LLM tutor: keep the signature, replace the body with
 * `await fetch('/api/tutor', …)` returning the same shape.
 */
export function basicStrategyAdvice(
  player: Card[],
  dealerUp: Card,
  ctx: Partial<AdviceContext> = {},
): TutorAdvice {
  const canDouble = ctx.canDouble ?? false;
  const canSplit = ctx.canSplit ?? false;

  if (
    canSplit &&
    player.length === 2 &&
    cardValue(player[0]) === cardValue(player[1])
  ) {
    const split = checkPairSplit(player[0], dealerUp);
    if (split) return split;
  }

  const { total, isSoft } = handTotal(player);
  const up = cardValue(dealerUp);

  if (canDouble && player.length === 2) {
    const dbl = checkDouble(total, isSoft, up, dealerUp);
    if (dbl) return dbl;
  }

  if (isSoft) return softAdvice(total, up, dealerUp);
  return hardAdvice(total, up, dealerUp);
}

function checkPairSplit(card: Card, dealerUp: Card): TutorAdvice | null {
  const v = cardValue(card);
  const up = cardValue(dealerUp);

  let shouldSplit = false;
  if (card.rank === "A") shouldSplit = true;
  else if (v === 10) shouldSplit = false;
  else if (v === 5) shouldSplit = false;
  else if (v === 8) shouldSplit = true;
  else if (v === 9) shouldSplit = up !== 7 && up !== 10 && up !== 11;
  else if (v === 7) shouldSplit = up >= 2 && up <= 7;
  else if (v === 6) shouldSplit = up >= 2 && up <= 6;
  else if (v === 4) shouldSplit = up === 5 || up === 6;
  else if (v === 2 || v === 3) shouldSplit = up >= 2 && up <= 7;

  if (!shouldSplit) return null;
  return {
    action: "Split",
    reason: splitReason(card, dealerUp),
  };
}

function splitReason(card: Card, dealerUp: Card): string {
  if (card.rank === "A") {
    return "Always split aces — two starting hands of 11 is the strongest opener you can get.";
  }
  if (cardValue(card) === 8) {
    return "Always split 8s — 16 is a losing total; two hands starting with 8 are far stronger.";
  }
  return `Splitting ${card.rank}s vs dealer ${labelUp(dealerUp)} gives you two hands at a meaningfully better expected value than playing the pair as one.`;
}

function checkDouble(
  total: number,
  isSoft: boolean,
  up: number,
  dealerUp: Card,
): TutorAdvice | null {
  if (isSoft) {
    if ((total === 13 || total === 14) && (up === 5 || up === 6)) {
      return doubleAdvice(`Soft ${total} vs ${labelUp(dealerUp)}`, dealerUp);
    }
    if ((total === 15 || total === 16) && up >= 4 && up <= 6) {
      return doubleAdvice(`Soft ${total} vs ${labelUp(dealerUp)}`, dealerUp);
    }
    if ((total === 17 || total === 18) && up >= 3 && up <= 6) {
      return doubleAdvice(`Soft ${total} vs ${labelUp(dealerUp)}`, dealerUp);
    }
    return null;
  }
  if (total === 11 && up !== 11) {
    return doubleAdvice("Hard 11", dealerUp);
  }
  if (total === 10 && up >= 2 && up <= 9) {
    return doubleAdvice("Hard 10", dealerUp);
  }
  if (total === 9 && up >= 3 && up <= 6) {
    return doubleAdvice("Hard 9", dealerUp);
  }
  return null;
}

function doubleAdvice(situation: string, dealerUp: Card): TutorAdvice {
  return {
    action: "Double",
    reason: `${situation}: dealer's ${labelUp(dealerUp)} is exposed. Doubling your bet here is the highest-EV play.`,
  };
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
  return {
    action: "Hit",
    reason: `Soft ${total} can't bust on the next card. Always take the free draw.`,
  };
}

function labelUp(c: Card): string {
  if (c.rank === "A") return "Ace";
  return c.rank;
}

/**
 * AI-backed tutor: calls /api/tutor (which uses Claude). Falls back to the
 * deterministic basicStrategyAdvice on any error so the UI never breaks.
 */
export async function aiTutorAdvice(
  player: Card[],
  dealerUp: Card,
  ctx: Partial<AdviceContext> = {},
): Promise<TutorAdvice> {
  try {
    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player,
        dealerUp,
        canDouble: ctx.canDouble ?? false,
        canSplit: ctx.canSplit ?? false,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as TutorAdvice;
    if (!data.action || !data.reason) {
      throw new Error("Malformed tutor response");
    }
    return data;
  } catch {
    return basicStrategyAdvice(player, dealerUp, ctx);
  }
}
