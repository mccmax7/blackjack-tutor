import type { Card, GameState } from "@/types";
import { createDeck, draw, shuffle } from "./deck";
import { handTotal, isBlackjack, isBust } from "./hand";

export function emptyState(): GameState {
  return {
    deck: [],
    player: [],
    dealer: [],
    status: "idle",
    holeHidden: true,
    bet: 0,
  };
}

/** Initial state for an opening deal: shuffled deck, no cards yet, status='dealing'. */
export function openingDeal(bet: number): GameState {
  return {
    deck: shuffle(createDeck()),
    player: [],
    dealer: [],
    status: "dealing",
    holeHidden: true,
    bet,
  };
}

/** Draws one card from the deck and adds it to the given hand. */
export function dealTo(
  state: GameState,
  to: "player" | "dealer",
): GameState {
  const { card, rest } = draw(state.deck);
  if (to === "player") {
    return { ...state, deck: rest, player: [...state.player, card] };
  }
  return { ...state, deck: rest, dealer: [...state.dealer, card] };
}

/** Called after the 4 opening cards are out. Resolves naturals or starts the player's turn. */
export function finalizeOpening(state: GameState): GameState {
  const playerBJ = isBlackjack(state.player);
  const dealerBJ = isBlackjack(state.dealer);
  if (playerBJ && dealerBJ) {
    return { ...state, status: "push", holeHidden: false };
  }
  if (playerBJ) {
    return { ...state, status: "player-blackjack", holeHidden: false };
  }
  if (dealerBJ) {
    return { ...state, status: "dealer-blackjack", holeHidden: false };
  }
  return { ...state, status: "player-turn", holeHidden: true };
}

export function hit(state: GameState): GameState {
  if (state.status !== "player-turn") return state;
  const { card, rest } = draw(state.deck);
  const player = [...state.player, card];
  if (isBust(player)) {
    return {
      ...state,
      deck: rest,
      player,
      status: "player-bust",
      holeHidden: false,
    };
  }
  return { ...state, deck: rest, player };
}

/** Player stand: reveal the hole card and switch to dealer-turn. The page drives subsequent dealer hits on a timer. */
export function revealHoleAndStand(state: GameState): GameState {
  if (state.status !== "player-turn") return state;
  return { ...state, status: "dealer-turn", holeHidden: false };
}

/** Adds one card to the dealer (no status change). Called per timer tick during dealer-turn. */
export function dealerHit(state: GameState): GameState {
  if (state.status !== "dealer-turn") return state;
  return dealTo(state, "dealer");
}

/** Dealer hits while total < 17. Stand on any 17 (incl. soft 17, per spec). */
export function dealerShouldStop(state: GameState): boolean {
  return handTotal(state.dealer).total >= 17;
}

/** Resolves a dealer-turn hand to its terminal status. Bet was already deducted at deal time. */
export function settle(state: GameState): GameState {
  if (state.status !== "dealer-turn") return state;
  if (isBust(state.dealer)) {
    return { ...state, status: "dealer-bust", holeHidden: false };
  }
  const playerTotal = handTotal(state.player).total;
  const dealerTotal = handTotal(state.dealer).total;
  if (playerTotal > dealerTotal) {
    return { ...state, status: "player-win", holeHidden: false };
  }
  if (playerTotal < dealerTotal) {
    return { ...state, status: "dealer-win", holeHidden: false };
  }
  return { ...state, status: "push", holeHidden: false };
}

export function isTerminal(state: GameState): boolean {
  return (
    state.status === "player-bust" ||
    state.status === "dealer-bust" ||
    state.status === "player-win" ||
    state.status === "dealer-win" ||
    state.status === "push" ||
    state.status === "player-blackjack" ||
    state.status === "dealer-blackjack"
  );
}

/**
 * Amount returned to the player's bankroll on settlement.
 * Bet was already deducted at deal time, so:
 *   loss   → 0
 *   push   → bet (just gets the bet back)
 *   win    → bet * 2 (bet back + 1x profit)
 *   bj 3:2 → bet * 2.5 (bet back + 1.5x profit, rounded down)
 */
export function payoutFor(state: GameState): number {
  switch (state.status) {
    case "player-blackjack":
      return Math.floor(state.bet * 2.5);
    case "dealer-bust":
    case "player-win":
      return state.bet * 2;
    case "push":
      return state.bet;
    default:
      return 0;
  }
}

/** Used by Card type imports — re-export for convenience. */
export type { Card };
