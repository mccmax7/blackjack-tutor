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

export function startNewHand(bet: number): GameState {
  let deck = shuffle(createDeck());
  let player: Card[] = [];
  let dealer: Card[] = [];

  // Standard deal: P, D, P, D
  ({ deck, player, dealer } = dealOne(deck, player, dealer, "player"));
  ({ deck, player, dealer } = dealOne(deck, player, dealer, "dealer"));
  ({ deck, player, dealer } = dealOne(deck, player, dealer, "player"));
  ({ deck, player, dealer } = dealOne(deck, player, dealer, "dealer"));

  const playerBJ = isBlackjack(player);
  const dealerBJ = isBlackjack(dealer);

  if (playerBJ && dealerBJ) {
    return { deck, player, dealer, status: "push", holeHidden: false, bet };
  }
  if (playerBJ) {
    return {
      deck,
      player,
      dealer,
      status: "player-blackjack",
      holeHidden: false,
      bet,
    };
  }
  if (dealerBJ) {
    return {
      deck,
      player,
      dealer,
      status: "dealer-blackjack",
      holeHidden: false,
      bet,
    };
  }

  return {
    deck,
    player,
    dealer,
    status: "player-turn",
    holeHidden: true,
    bet,
  };
}

function dealOne(
  deck: Card[],
  player: Card[],
  dealer: Card[],
  to: "player" | "dealer",
): { deck: Card[]; player: Card[]; dealer: Card[] } {
  const { card, rest } = draw(deck);
  if (to === "player") {
    return { deck: rest, player: [...player, card], dealer };
  }
  return { deck: rest, player, dealer: [...dealer, card] };
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

export function stand(state: GameState): GameState {
  if (state.status !== "player-turn") return state;

  // Reveal hole card and play out the dealer's hand.
  let deck = state.deck;
  let dealer = state.dealer;

  // Dealer hits while total < 17. Stands on any 17 — including soft 17 (per spec).
  while (true) {
    const { total } = handTotal(dealer);
    if (total >= 17) break;
    const { card, rest } = draw(deck);
    dealer = [...dealer, card];
    deck = rest;
  }

  return settle({
    ...state,
    deck,
    dealer,
    status: "dealer-turn",
    holeHidden: false,
  });
}

function settle(state: GameState): GameState {
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
    state.status !== "idle" &&
    state.status !== "player-turn" &&
    state.status !== "dealer-turn"
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
