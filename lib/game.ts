import type {
  Card,
  GameState,
  HandResult,
  PlayerHand,
} from "@/types";
import { cardValue, createDeck, draw, shuffle } from "./deck";
import { handTotal, isBlackjack, isBust } from "./hand";

export function emptyState(): GameState {
  return {
    deck: [],
    hands: [],
    activeHandIndex: 0,
    dealer: [],
    status: "idle",
    holeHidden: true,
    bet: 0,
  };
}

/** Initial state for an opening deal: shuffled deck, empty hand, status='dealing'. */
export function openingDeal(bet: number): GameState {
  return {
    deck: shuffle(createDeck()),
    hands: [{ cards: [], bet, status: "active" }],
    activeHandIndex: 0,
    dealer: [],
    status: "dealing",
    holeHidden: true,
    bet,
  };
}

/** Draws one card from the deck and adds it to the active player hand or dealer. */
export function dealTo(
  state: GameState,
  to: "player" | "dealer",
): GameState {
  const { card, rest } = draw(state.deck);
  if (to === "player") {
    const hands = state.hands.map((h, i) =>
      i === state.activeHandIndex ? { ...h, cards: [...h.cards, card] } : h,
    );
    return { ...state, deck: rest, hands };
  }
  return { ...state, deck: rest, dealer: [...state.dealer, card] };
}

/** After 4 opening cards are out, resolve naturals or start the player's turn. */
export function finalizeOpening(state: GameState): GameState {
  const player = state.hands[0]?.cards ?? [];
  const playerBJ = isBlackjack(player);
  const dealerBJ = isBlackjack(state.dealer);
  if (playerBJ || dealerBJ) {
    // Resolve immediately. Per-hand result + status='settled'.
    const hands = state.hands.map((h, i) =>
      i === 0
        ? {
            ...h,
            status: playerBJ
              ? ("blackjack" as const)
              : ("standing" as const),
            result: ((): HandResult => {
              if (playerBJ && dealerBJ) return "push";
              if (playerBJ) return "blackjack";
              return "loss";
            })(),
          }
        : h,
    );
    return { ...state, hands, status: "settled", holeHidden: false };
  }
  return { ...state, status: "player-turn", holeHidden: true };
}

/** Active hand convenience accessor. */
export function activeHand(state: GameState): PlayerHand | undefined {
  return state.hands[state.activeHandIndex];
}

export function hit(state: GameState): GameState {
  if (state.status !== "player-turn") return state;
  const cur = activeHand(state);
  if (!cur || cur.status !== "active") return state;
  const { card, rest } = draw(state.deck);
  const cards = [...cur.cards, card];
  const busted = isBust(cards);
  const hands = state.hands.map((h, i) =>
    i === state.activeHandIndex
      ? { ...h, cards, status: busted ? ("busted" as const) : h.status }
      : h,
  );
  let next: GameState = { ...state, deck: rest, hands };
  if (busted) next = advance(next);
  return next;
}

/** Player chooses to stand on the active hand. */
export function standCurrentHand(state: GameState): GameState {
  if (state.status !== "player-turn") return state;
  const cur = activeHand(state);
  if (!cur || cur.status !== "active") return state;
  const hands = state.hands.map((h, i) =>
    i === state.activeHandIndex ? { ...h, status: "standing" as const } : h,
  );
  return advance({ ...state, hands });
}

export function canDouble(state: GameState, bankroll: number): boolean {
  if (state.status !== "player-turn") return false;
  const cur = activeHand(state);
  if (!cur || cur.status !== "active") return false;
  if (cur.cards.length !== 2) return false;
  return bankroll >= cur.bet;
}

/**
 * Caller is responsible for deducting the additional bet from the bankroll
 * before invoking this. Action: deal one card, double the hand's bet, then
 * advance (since doubling is "stand after this card").
 */
export function doubleDown(state: GameState): GameState {
  if (state.status !== "player-turn") return state;
  const cur = activeHand(state);
  if (!cur || cur.status !== "active" || cur.cards.length !== 2) return state;
  const { card, rest } = draw(state.deck);
  const cards = [...cur.cards, card];
  const busted = isBust(cards);
  const hands = state.hands.map((h, i) =>
    i === state.activeHandIndex
      ? {
          ...h,
          cards,
          bet: h.bet * 2,
          status: busted ? ("busted" as const) : ("doubled" as const),
        }
      : h,
  );
  return advance({ ...state, deck: rest, hands });
}

export function canSplit(state: GameState, bankroll: number): boolean {
  if (state.status !== "player-turn") return false;
  const cur = activeHand(state);
  if (!cur || cur.status !== "active") return false;
  if (cur.cards.length !== 2) return false;
  if (cardValue(cur.cards[0]) !== cardValue(cur.cards[1])) return false;
  // House rule: no resplits in MVP.
  if (cur.fromSplit) return false;
  return bankroll >= cur.bet;
}

/**
 * Caller is responsible for deducting the additional bet from the bankroll
 * before invoking this. Splits the active hand into two; deals one card to
 * each. Aces split: each gets exactly one card and auto-stands.
 */
export function splitPair(state: GameState): GameState {
  if (state.status !== "player-turn") return state;
  const cur = activeHand(state);
  if (!cur || cur.cards.length !== 2) return state;

  const [c1, c2] = cur.cards;
  const isAces = c1.rank === "A";

  let deck = state.deck;
  const a = draw(deck);
  deck = a.rest;
  const b = draw(deck);
  deck = b.rest;

  const hand1: PlayerHand = {
    cards: [c1, a.card],
    bet: cur.bet,
    status: isAces ? "standing" : "active",
    fromSplit: true,
  };
  const hand2: PlayerHand = {
    cards: [c2, b.card],
    bet: cur.bet,
    status: isAces ? "standing" : "active",
    fromSplit: true,
  };

  const idx = state.activeHandIndex;
  const hands = [...state.hands];
  hands.splice(idx, 1, hand1, hand2);

  const next: GameState = { ...state, deck, hands };
  // For aces both are already standing — advance past them.
  return isAces ? advance(next) : next;
}

/**
 * If the active hand is no longer 'active', move to the next active hand
 * (skipping any in standing/busted/doubled). If none remain, transition the
 * game to dealer-turn (revealing the hole card).
 */
function advance(state: GameState): GameState {
  let i = state.activeHandIndex;
  // The current hand may have been just resolved; skip non-active forward.
  if (state.hands[i]?.status === "active") return state;
  while (i < state.hands.length && state.hands[i].status !== "active") {
    i++;
  }
  if (i < state.hands.length) {
    return { ...state, activeHandIndex: i };
  }
  // All hands resolved. If every hand busted, dealer wins immediately
  // without playing out — settle right now.
  const allBusted = state.hands.every((h) => h.status === "busted");
  if (allBusted) {
    return settle({
      ...state,
      status: "dealer-turn",
      holeHidden: false,
    });
  }
  return { ...state, status: "dealer-turn", holeHidden: false };
}

/** Adds one card to the dealer (no status change). Called per timer tick during dealer-turn. */
export function dealerHit(state: GameState): GameState {
  if (state.status !== "dealer-turn") return state;
  return dealTo(state, "dealer");
}

/** Dealer hits while total < 17. Stands on any 17 (incl. soft 17, per spec). */
export function dealerShouldStop(state: GameState): boolean {
  return handTotal(state.dealer).total >= 17;
}

/** Resolves a dealer-turn hand to status='settled' with each hand's result populated. */
export function settle(state: GameState): GameState {
  if (state.status !== "dealer-turn") return state;
  const dealerBust = isBust(state.dealer);
  const dealerTotal = handTotal(state.dealer).total;
  const hands = state.hands.map((h) => {
    if (h.status === "busted") return { ...h, result: "loss" as HandResult };
    const playerTotal = handTotal(h.cards).total;
    let r: HandResult;
    if (dealerBust) r = "win";
    else if (playerTotal > dealerTotal) r = "win";
    else if (playerTotal < dealerTotal) r = "loss";
    else r = "push";
    return { ...h, result: r };
  });
  return { ...state, hands, status: "settled", holeHidden: false };
}

export function isTerminal(state: GameState): boolean {
  return state.status === "settled";
}

/** Sum of payouts across all hands. */
export function payoutFor(state: GameState): number {
  if (state.status !== "settled") return 0;
  return state.hands.reduce((sum, h) => sum + payoutForHand(h), 0);
}

function payoutForHand(h: PlayerHand): number {
  switch (h.result) {
    case "blackjack":
      return Math.floor(h.bet * 2.5);
    case "win":
      return h.bet * 2;
    case "push":
      return h.bet;
    default:
      return 0;
  }
}

/** Total amount currently committed to the table (sum of per-hand bets). */
export function totalCommitted(state: GameState): number {
  return state.hands.reduce((sum, h) => sum + h.bet, 0);
}

/** Net delta to bankroll for the resolved hand: payouts - amount staked. */
export function netDelta(state: GameState): number {
  if (state.status !== "settled") return 0;
  return payoutFor(state) - totalCommitted(state);
}
