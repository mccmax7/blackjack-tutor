import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "@/types";
import { cardValue, createDeck, draw, shuffle } from "@/lib/deck";

function seededRng(seed: number): () => number {
  // tiny LCG so tests are deterministic without depending on Math.random
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("createDeck", () => {
  it("returns 52 cards", () => {
    expect(createDeck()).toHaveLength(52);
  });

  it("contains all 4 suits × 13 ranks with no duplicates", () => {
    const deck = createDeck();
    const ids = new Set(deck.map((c) => `${c.rank}-${c.suit}`));
    expect(ids.size).toBe(52);
    const suits: Suit[] = ["♠", "♥", "♦", "♣"];
    const ranks: Rank[] = [
      "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K",
    ];
    for (const s of suits) {
      for (const r of ranks) {
        expect(ids.has(`${r}-${s}`)).toBe(true);
      }
    }
  });
});

describe("shuffle", () => {
  it("preserves the multiset", () => {
    const deck = createDeck();
    const out = shuffle(deck, seededRng(42));
    expect(out).toHaveLength(52);
    const before = deck.map((c) => `${c.rank}-${c.suit}`).sort();
    const after = out.map((c) => `${c.rank}-${c.suit}`).sort();
    expect(after).toEqual(before);
  });

  it("is deterministic for a fixed seed", () => {
    const a = shuffle(createDeck(), seededRng(7));
    const b = shuffle(createDeck(), seededRng(7));
    expect(a).toEqual(b);
  });

  it("changes order for a non-trivial deck", () => {
    const deck = createDeck();
    const out = shuffle(deck, seededRng(1));
    const equal = deck.every(
      (c, i) => c.rank === out[i].rank && c.suit === out[i].suit,
    );
    expect(equal).toBe(false);
  });

  it("does not mutate input", () => {
    const deck = createDeck();
    const snapshot = deck.map((c) => `${c.rank}-${c.suit}`);
    shuffle(deck, seededRng(99));
    expect(deck.map((c) => `${c.rank}-${c.suit}`)).toEqual(snapshot);
  });
});

describe("draw", () => {
  it("returns the first card and a 1-shorter rest", () => {
    const deck: Card[] = [
      { rank: "A", suit: "♠" },
      { rank: "5", suit: "♥" },
    ];
    const { card, rest } = draw(deck);
    expect(card).toEqual({ rank: "A", suit: "♠" });
    expect(rest).toEqual([{ rank: "5", suit: "♥" }]);
  });

  it("throws on empty deck", () => {
    expect(() => draw([])).toThrowError(/empty/i);
  });
});

describe("cardValue", () => {
  it("ace counts as 11", () => {
    expect(cardValue({ rank: "A", suit: "♠" })).toBe(11);
  });
  it("face cards count as 10", () => {
    expect(cardValue({ rank: "K", suit: "♥" })).toBe(10);
    expect(cardValue({ rank: "Q", suit: "♦" })).toBe(10);
    expect(cardValue({ rank: "J", suit: "♣" })).toBe(10);
  });
  it("number cards use their rank", () => {
    expect(cardValue({ rank: "2", suit: "♠" })).toBe(2);
    expect(cardValue({ rank: "10", suit: "♥" })).toBe(10);
  });
});
