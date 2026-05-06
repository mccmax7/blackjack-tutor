import { describe, expect, it } from "vitest";
import type { Card, GameState, PlayerHand, Rank } from "@/types";
import {
  canDouble,
  canSplit,
  dealTo,
  dealerHit,
  dealerShouldStop,
  doubleDown,
  finalizeOpening,
  hit,
  isTerminal,
  netDelta,
  openingDeal,
  payoutFor,
  settle,
  splitPair,
  standCurrentHand,
  totalCommitted,
} from "@/lib/game";

const c = (rank: Rank): Card => ({ rank, suit: "♠" });

function hand(cards: Card[], bet = 50, extra: Partial<PlayerHand> = {}): PlayerHand {
  return { cards, bet, status: "active", ...extra };
}

function stateWith(partial: Partial<GameState>): GameState {
  return {
    deck: [],
    hands: [hand([])],
    activeHandIndex: 0,
    dealer: [],
    status: "player-turn",
    holeHidden: true,
    bet: 50,
    ...partial,
  };
}

describe("openingDeal", () => {
  it("starts in 'dealing' with one empty hand and a 52-card deck", () => {
    const s = openingDeal(50);
    expect(s.status).toBe("dealing");
    expect(s.bet).toBe(50);
    expect(s.hands).toHaveLength(1);
    expect(s.hands[0].cards).toHaveLength(0);
    expect(s.hands[0].bet).toBe(50);
    expect(s.hands[0].status).toBe("active");
    expect(s.activeHandIndex).toBe(0);
    expect(s.dealer).toHaveLength(0);
    expect(s.deck).toHaveLength(52);
    expect(s.holeHidden).toBe(true);
  });
});

describe("dealTo", () => {
  it("sends a card to the active player hand", () => {
    const s = stateWith({ deck: [c("A"), c("K")] });
    const next = dealTo(s, "player");
    expect(next.hands[0].cards).toEqual([c("A")]);
    expect(next.deck).toEqual([c("K")]);
  });
  it("sends a card to the dealer", () => {
    const s = stateWith({ deck: [c("A"), c("K")] });
    const next = dealTo(s, "dealer");
    expect(next.dealer).toEqual([c("A")]);
    expect(next.deck).toEqual([c("K")]);
  });
});

describe("finalizeOpening", () => {
  it("both blackjack → settled with push", () => {
    const s = stateWith({
      status: "dealing",
      hands: [hand([c("A"), c("K")])],
      dealer: [c("A"), c("Q")],
    });
    const out = finalizeOpening(s);
    expect(out.status).toBe("settled");
    expect(out.hands[0].result).toBe("push");
    expect(out.holeHidden).toBe(false);
  });
  it("only player BJ → settled with blackjack result", () => {
    const s = stateWith({
      status: "dealing",
      hands: [hand([c("A"), c("K")])],
      dealer: [c("9"), c("8")],
    });
    const out = finalizeOpening(s);
    expect(out.status).toBe("settled");
    expect(out.hands[0].result).toBe("blackjack");
  });
  it("only dealer BJ → settled with loss", () => {
    const s = stateWith({
      status: "dealing",
      hands: [hand([c("9"), c("9")])],
      dealer: [c("A"), c("J")],
    });
    const out = finalizeOpening(s);
    expect(out.status).toBe("settled");
    expect(out.hands[0].result).toBe("loss");
  });
  it("neither → player-turn", () => {
    const s = stateWith({
      status: "dealing",
      hands: [hand([c("9"), c("9")])],
      dealer: [c("9"), c("8")],
    });
    expect(finalizeOpening(s).status).toBe("player-turn");
  });
});

describe("hit", () => {
  it("adds a card and stays in player-turn when not bust", () => {
    const s = stateWith({
      deck: [c("5")],
      hands: [hand([c("8"), c("4")])],
    });
    const next = hit(s);
    expect(next.hands[0].cards).toEqual([c("8"), c("4"), c("5")]);
    expect(next.hands[0].status).toBe("active");
    expect(next.status).toBe("player-turn");
  });
  it("marks hand busted and transitions to dealer-turn (single hand)", () => {
    const s = stateWith({
      deck: [c("Q")],
      hands: [hand([c("10"), c("8")])],
    });
    const next = hit(s);
    expect(next.hands[0].status).toBe("busted");
    // With only one hand, after bust the game settles immediately.
    expect(next.status).toBe("settled");
    expect(next.hands[0].result).toBe("loss");
  });
  it("noop outside player-turn", () => {
    const s = stateWith({ status: "dealer-turn", deck: [c("5")] });
    expect(hit(s)).toBe(s);
  });
});

describe("standCurrentHand", () => {
  it("marks active hand standing and transitions to dealer-turn", () => {
    const s = stateWith({ hands: [hand([c("10"), c("8")])] });
    const next = standCurrentHand(s);
    expect(next.hands[0].status).toBe("standing");
    expect(next.status).toBe("dealer-turn");
    expect(next.holeHidden).toBe(false);
  });
  it("with multiple hands, advances to next active hand", () => {
    const s = stateWith({
      hands: [
        hand([c("9"), c("9")]),
        hand([c("8"), c("8")]),
      ],
      activeHandIndex: 0,
    });
    const next = standCurrentHand(s);
    expect(next.hands[0].status).toBe("standing");
    expect(next.activeHandIndex).toBe(1);
    expect(next.status).toBe("player-turn");
  });
});

describe("canDouble / doubleDown", () => {
  it("canDouble true on 2 cards with bankroll", () => {
    const s = stateWith({ hands: [hand([c("6"), c("5")], 50)] });
    expect(canDouble(s, 100)).toBe(true);
  });
  it("canDouble false after 3 cards", () => {
    const s = stateWith({ hands: [hand([c("6"), c("5"), c("3")], 50)] });
    expect(canDouble(s, 100)).toBe(false);
  });
  it("canDouble false when bankroll too low", () => {
    const s = stateWith({ hands: [hand([c("6"), c("5")], 50)] });
    expect(canDouble(s, 10)).toBe(false);
  });
  it("doubleDown deals one card, doubles bet, marks hand 'doubled', goes to dealer-turn", () => {
    const s = stateWith({
      deck: [c("9")],
      hands: [hand([c("6"), c("5")], 50)],
    });
    const next = doubleDown(s);
    expect(next.hands[0].cards).toEqual([c("6"), c("5"), c("9")]);
    expect(next.hands[0].bet).toBe(100);
    expect(next.hands[0].status).toBe("doubled");
    expect(next.status).toBe("dealer-turn");
  });
  it("doubleDown bust → settled", () => {
    const s = stateWith({
      deck: [c("Q")],
      hands: [hand([c("10"), c("5")], 50)],
    });
    const next = doubleDown(s);
    expect(next.hands[0].status).toBe("busted");
    expect(next.status).toBe("settled");
  });
});

describe("canSplit / splitPair", () => {
  it("canSplit true for matching ranks with bankroll", () => {
    const s = stateWith({ hands: [hand([c("8"), c("8")], 50)] });
    expect(canSplit(s, 100)).toBe(true);
  });
  it("canSplit true for face-card pair (J,Q both value 10)", () => {
    const s = stateWith({
      hands: [
        hand([
          { rank: "J", suit: "♠" },
          { rank: "Q", suit: "♥" },
        ], 50),
      ],
    });
    expect(canSplit(s, 100)).toBe(true);
  });
  it("canSplit false when ranks differ", () => {
    const s = stateWith({ hands: [hand([c("8"), c("9")])] });
    expect(canSplit(s, 100)).toBe(false);
  });
  it("canSplit false on resplits (fromSplit hand)", () => {
    const s = stateWith({
      hands: [hand([c("8"), c("8")], 50, { fromSplit: true })],
    });
    expect(canSplit(s, 100)).toBe(false);
  });
  it("splitPair creates two hands, each with one of the pair + one fresh card", () => {
    const s = stateWith({
      deck: [c("4"), c("9"), c("Q")],
      hands: [hand([c("8"), c("8")], 50)],
    });
    const next = splitPair(s);
    expect(next.hands).toHaveLength(2);
    expect(next.hands[0].cards).toEqual([c("8"), c("4")]);
    expect(next.hands[1].cards).toEqual([c("8"), c("9")]);
    expect(next.hands[0].bet).toBe(50);
    expect(next.hands[1].bet).toBe(50);
    expect(next.hands[0].fromSplit).toBe(true);
    expect(next.hands[0].status).toBe("active");
    expect(next.activeHandIndex).toBe(0);
  });
  it("splitting aces auto-stands both new hands and goes to dealer-turn", () => {
    const s = stateWith({
      deck: [c("5"), c("K")],
      hands: [hand([c("A"), c("A")], 50)],
    });
    const next = splitPair(s);
    expect(next.hands[0].status).toBe("standing");
    expect(next.hands[1].status).toBe("standing");
    expect(next.status).toBe("dealer-turn");
  });
});

describe("dealerShouldStop", () => {
  it("stops at 17", () => {
    expect(
      dealerShouldStop(stateWith({ dealer: [c("10"), c("7")] })),
    ).toBe(true);
  });
  it("stops on soft 17 (A,6)", () => {
    expect(
      dealerShouldStop(stateWith({ dealer: [c("A"), c("6")] })),
    ).toBe(true);
  });
  it("hits at 16", () => {
    expect(
      dealerShouldStop(stateWith({ dealer: [c("10"), c("6")] })),
    ).toBe(false);
  });
});

describe("dealerHit", () => {
  it("only fires during dealer-turn", () => {
    const s = stateWith({
      status: "player-turn",
      deck: [c("5")],
      dealer: [c("10")],
    });
    expect(dealerHit(s)).toBe(s);
  });
  it("adds to dealer when in dealer-turn", () => {
    const s = stateWith({
      status: "dealer-turn",
      deck: [c("5")],
      dealer: [c("10")],
    });
    expect(dealerHit(s).dealer).toEqual([c("10"), c("5")]);
  });
});

describe("settle", () => {
  it("dealer bust → all non-busted hands win", () => {
    const s = stateWith({
      status: "dealer-turn",
      hands: [hand([c("10"), c("9")], 50, { status: "standing" })],
      dealer: [c("10"), c("6"), c("Q")],
    });
    const out = settle(s);
    expect(out.status).toBe("settled");
    expect(out.hands[0].result).toBe("win");
  });
  it("player higher → win", () => {
    const s = stateWith({
      status: "dealer-turn",
      hands: [hand([c("10"), c("9")], 50, { status: "standing" })],
      dealer: [c("10"), c("7")],
    });
    expect(settle(s).hands[0].result).toBe("win");
  });
  it("dealer higher → loss", () => {
    const s = stateWith({
      status: "dealer-turn",
      hands: [hand([c("10"), c("7")], 50, { status: "standing" })],
      dealer: [c("10"), c("9")],
    });
    expect(settle(s).hands[0].result).toBe("loss");
  });
  it("equal → push", () => {
    const s = stateWith({
      status: "dealer-turn",
      hands: [hand([c("10"), c("8")], 50, { status: "standing" })],
      dealer: [c("10"), c("8")],
    });
    expect(settle(s).hands[0].result).toBe("push");
  });
  it("busted hand always loses regardless of dealer", () => {
    const s = stateWith({
      status: "dealer-turn",
      hands: [hand([c("10"), c("8"), c("Q")], 50, { status: "busted" })],
      dealer: [c("10"), c("6"), c("Q")], // dealer also bust
    });
    expect(settle(s).hands[0].result).toBe("loss");
  });
  it("multiple hands resolve independently", () => {
    const s = stateWith({
      status: "dealer-turn",
      hands: [
        hand([c("10"), c("9")], 50, { status: "standing" }),
        hand([c("10"), c("5"), c("Q")], 50, { status: "busted" }),
      ],
      dealer: [c("10"), c("8")],
    });
    const out = settle(s);
    expect(out.hands[0].result).toBe("win");
    expect(out.hands[1].result).toBe("loss");
  });
});

describe("isTerminal", () => {
  it("true only for settled", () => {
    expect(isTerminal(stateWith({ status: "settled" }))).toBe(true);
    expect(isTerminal(stateWith({ status: "player-turn" }))).toBe(false);
    expect(isTerminal(stateWith({ status: "dealer-turn" }))).toBe(false);
    expect(isTerminal(stateWith({ status: "idle" }))).toBe(false);
    expect(isTerminal(stateWith({ status: "dealing" }))).toBe(false);
  });
});

describe("payoutFor / netDelta / totalCommitted", () => {
  function settled(hands: PlayerHand[]): GameState {
    return stateWith({ status: "settled", hands });
  }

  it("blackjack pays floor(bet * 2.5)", () => {
    expect(
      payoutFor(settled([hand([], 50, { result: "blackjack", status: "blackjack" })])),
    ).toBe(125);
    expect(
      payoutFor(settled([hand([], 25, { result: "blackjack", status: "blackjack" })])),
    ).toBe(62);
  });
  it("regular win pays bet * 2", () => {
    expect(
      payoutFor(settled([hand([], 30, { result: "win", status: "standing" })])),
    ).toBe(60);
  });
  it("push returns the bet", () => {
    expect(
      payoutFor(settled([hand([], 30, { result: "push", status: "standing" })])),
    ).toBe(30);
  });
  it("loss returns 0", () => {
    expect(
      payoutFor(settled([hand([], 30, { result: "loss", status: "busted" })])),
    ).toBe(0);
  });
  it("sums payouts across hands", () => {
    expect(
      payoutFor(
        settled([
          hand([], 50, { result: "win", status: "standing" }),
          hand([], 50, { result: "loss", status: "busted" }),
        ]),
      ),
    ).toBe(100);
  });
  it("totalCommitted sums per-hand bets (incl. doubles)", () => {
    expect(
      totalCommitted(
        settled([
          hand([], 100, { result: "win", status: "doubled" }),
          hand([], 50, { result: "loss", status: "busted" }),
        ]),
      ),
    ).toBe(150);
  });
  it("netDelta = payouts - committed", () => {
    // Doubled win: bet 100 (was 50, doubled), payout = 200 → net +100.
    expect(
      netDelta(settled([hand([], 100, { result: "win", status: "doubled" })])),
    ).toBe(100);
    // Push: net 0.
    expect(
      netDelta(settled([hand([], 50, { result: "push", status: "standing" })])),
    ).toBe(0);
    // Loss: net -bet.
    expect(
      netDelta(settled([hand([], 50, { result: "loss", status: "busted" })])),
    ).toBe(-50);
    // Blackjack: floor(50 * 2.5) - 50 = 125 - 50 = 75.
    expect(
      netDelta(
        settled([hand([], 50, { result: "blackjack", status: "blackjack" })]),
      ),
    ).toBe(75);
  });
});
