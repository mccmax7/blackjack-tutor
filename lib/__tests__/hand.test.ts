import { describe, expect, it } from "vitest";
import type { Card, Rank } from "@/types";
import { handTotal, isBlackjack, isBust } from "@/lib/hand";

const c = (rank: Rank): Card => ({ rank, suit: "♠" });

describe("handTotal", () => {
  it("sums simple hard totals", () => {
    expect(handTotal([c("2"), c("3")])).toEqual({ total: 5, isSoft: false });
    expect(handTotal([c("10"), c("7")])).toEqual({ total: 17, isSoft: false });
    expect(handTotal([c("K"), c("J")])).toEqual({ total: 20, isSoft: false });
  });

  it("counts ace as 11 when it doesn't bust (soft)", () => {
    expect(handTotal([c("A"), c("6")])).toEqual({ total: 17, isSoft: true });
  });

  it("downgrades aces when over 21", () => {
    expect(handTotal([c("A"), c("6"), c("9")])).toEqual({
      total: 16,
      isSoft: false,
    });
  });

  it("handles two aces (A,A → 12 soft)", () => {
    expect(handTotal([c("A"), c("A")])).toEqual({ total: 12, isSoft: true });
  });

  it("multi-ace soft 21 (A,A,9)", () => {
    expect(handTotal([c("A"), c("A"), c("9")])).toEqual({
      total: 21,
      isSoft: true,
    });
  });

  it("multi-ace forced hard (A,A,9,Q)", () => {
    expect(handTotal([c("A"), c("A"), c("9"), c("Q")])).toEqual({
      total: 21,
      isSoft: false,
    });
  });
});

describe("isBlackjack", () => {
  it("true on 2-card 21 with an ace", () => {
    expect(isBlackjack([c("A"), c("K")])).toBe(true);
    expect(isBlackjack([c("A"), c("10")])).toBe(true);
  });
  it("false on 3+ cards summing to 21", () => {
    expect(isBlackjack([c("7"), c("7"), c("7")])).toBe(false);
    expect(isBlackjack([c("A"), c("5"), c("5")])).toBe(false);
  });
  it("false on 2-card non-21", () => {
    expect(isBlackjack([c("10"), c("9")])).toBe(false);
  });
});

describe("isBust", () => {
  it("true when total > 21", () => {
    expect(isBust([c("10"), c("5"), c("Q")])).toBe(true);
  });
  it("false at exactly 21", () => {
    expect(isBust([c("10"), c("5"), c("6")])).toBe(false);
  });
  it("false on soft hands that downgrade", () => {
    expect(isBust([c("A"), c("6"), c("5")])).toBe(false); // soft 22 → hard 12
  });
});
