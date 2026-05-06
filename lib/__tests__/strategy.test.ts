import { describe, expect, it } from "vitest";
import type { Card, Rank } from "@/types";
import { basicStrategyAdvice } from "@/lib/strategy";

const c = (rank: Rank): Card => ({ rank, suit: "♠" });

// helper that asserts on the action only — reason text is allowed to vary
function action(player: Card[], dealerUp: Card) {
  return basicStrategyAdvice(player, dealerUp).action;
}

describe("basicStrategyAdvice — hard totals", () => {
  it("8 always hits", () => {
    expect(action([c("3"), c("5")], c("2"))).toBe("Hit");
    expect(action([c("3"), c("5")], c("A"))).toBe("Hit");
  });
  it("11 always hits (Double would be ideal but MVP is Hit-only)", () => {
    expect(action([c("6"), c("5")], c("10"))).toBe("Hit");
  });
  it("12 stands vs 4-6, hits otherwise", () => {
    expect(action([c("10"), c("2")], c("2"))).toBe("Hit");
    expect(action([c("10"), c("2")], c("3"))).toBe("Hit");
    expect(action([c("10"), c("2")], c("4"))).toBe("Stand");
    expect(action([c("10"), c("2")], c("5"))).toBe("Stand");
    expect(action([c("10"), c("2")], c("6"))).toBe("Stand");
    expect(action([c("10"), c("2")], c("7"))).toBe("Hit");
    expect(action([c("10"), c("2")], c("A"))).toBe("Hit");
  });
  it("13-16 stand vs 2-6, hit vs 7+", () => {
    expect(action([c("10"), c("3")], c("2"))).toBe("Stand");
    expect(action([c("10"), c("3")], c("6"))).toBe("Stand");
    expect(action([c("10"), c("6")], c("6"))).toBe("Stand");
    expect(action([c("10"), c("6")], c("7"))).toBe("Hit");
    expect(action([c("10"), c("6")], c("10"))).toBe("Hit");
    expect(action([c("10"), c("6")], c("A"))).toBe("Hit");
  });
  it("17+ always stand", () => {
    expect(action([c("10"), c("7")], c("A"))).toBe("Stand");
    expect(action([c("10"), c("8")], c("10"))).toBe("Stand");
    expect(action([c("10"), c("9")], c("9"))).toBe("Stand");
  });
});

describe("basicStrategyAdvice — soft totals", () => {
  it("soft 17 (A,6) always hits", () => {
    expect(action([c("A"), c("6")], c("2"))).toBe("Hit");
    expect(action([c("A"), c("6")], c("6"))).toBe("Hit");
    expect(action([c("A"), c("6")], c("A"))).toBe("Hit");
  });
  it("soft 18 (A,7) stands vs 2-8, hits vs 9/10/A", () => {
    expect(action([c("A"), c("7")], c("2"))).toBe("Stand");
    expect(action([c("A"), c("7")], c("7"))).toBe("Stand");
    expect(action([c("A"), c("7")], c("8"))).toBe("Stand");
    expect(action([c("A"), c("7")], c("9"))).toBe("Hit");
    expect(action([c("A"), c("7")], c("10"))).toBe("Hit");
    expect(action([c("A"), c("7")], c("A"))).toBe("Hit");
  });
  it("soft 19+ always stand", () => {
    expect(action([c("A"), c("8")], c("A"))).toBe("Stand");
    expect(action([c("A"), c("9")], c("10"))).toBe("Stand");
  });
  it("soft 16 (A,5) hits", () => {
    expect(action([c("A"), c("5")], c("6"))).toBe("Hit");
  });
});

describe("basicStrategyAdvice — multi-card cases", () => {
  it("treats hard 16 from 3 cards same as hard 16 from 2", () => {
    expect(action([c("5"), c("4"), c("7")], c("10"))).toBe("Hit");
    expect(action([c("5"), c("4"), c("7")], c("6"))).toBe("Stand");
  });
});

describe("basicStrategyAdvice — pairs (canSplit=true)", () => {
  const ctx = { canSplit: true };
  it("always splits aces", () => {
    expect(
      basicStrategyAdvice([c("A"), c("A")], c("10"), ctx).action,
    ).toBe("Split");
    expect(basicStrategyAdvice([c("A"), c("A")], c("6"), ctx).action).toBe(
      "Split",
    );
  });
  it("always splits 8s", () => {
    expect(basicStrategyAdvice([c("8"), c("8")], c("10"), ctx).action).toBe(
      "Split",
    );
    expect(basicStrategyAdvice([c("8"), c("8")], c("A"), ctx).action).toBe(
      "Split",
    );
  });
  it("never splits 10s (J,Q both value 10)", () => {
    const out = basicStrategyAdvice(
      [
        { rank: "J", suit: "♠" },
        { rank: "Q", suit: "♥" },
      ],
      c("6"),
      ctx,
    );
    expect(out.action).toBe("Stand");
  });
  it("never splits 5s (treat as hard 10)", () => {
    expect(basicStrategyAdvice([c("5"), c("5")], c("6"), ctx).action).not.toBe(
      "Split",
    );
  });
  it("9,9 splits vs 6 but stands vs 7", () => {
    expect(basicStrategyAdvice([c("9"), c("9")], c("6"), ctx).action).toBe(
      "Split",
    );
    expect(basicStrategyAdvice([c("9"), c("9")], c("7"), ctx).action).toBe(
      "Stand",
    );
  });
  it("7,7 splits vs 7 but not vs 8", () => {
    expect(basicStrategyAdvice([c("7"), c("7")], c("7"), ctx).action).toBe(
      "Split",
    );
    expect(basicStrategyAdvice([c("7"), c("7")], c("8"), ctx).action).toBe(
      "Hit",
    );
  });
  it("4,4 splits only vs 5/6", () => {
    expect(basicStrategyAdvice([c("4"), c("4")], c("5"), ctx).action).toBe(
      "Split",
    );
    expect(basicStrategyAdvice([c("4"), c("4")], c("6"), ctx).action).toBe(
      "Split",
    );
    expect(basicStrategyAdvice([c("4"), c("4")], c("4"), ctx).action).toBe(
      "Hit",
    );
  });
  it("does not split when canSplit is false", () => {
    expect(basicStrategyAdvice([c("8"), c("8")], c("6")).action).not.toBe(
      "Split",
    );
  });
});

describe("basicStrategyAdvice — doubles (canDouble=true)", () => {
  const ctx = { canDouble: true };
  it("hard 11 doubles vs anything but Ace", () => {
    expect(basicStrategyAdvice([c("6"), c("5")], c("10"), ctx).action).toBe(
      "Double",
    );
    expect(basicStrategyAdvice([c("6"), c("5")], c("A"), ctx).action).toBe(
      "Hit",
    );
  });
  it("hard 10 doubles vs 2-9 but not vs 10/A", () => {
    expect(basicStrategyAdvice([c("6"), c("4")], c("9"), ctx).action).toBe(
      "Double",
    );
    expect(basicStrategyAdvice([c("6"), c("4")], c("10"), ctx).action).toBe(
      "Hit",
    );
  });
  it("hard 9 doubles only vs 3-6", () => {
    expect(basicStrategyAdvice([c("4"), c("5")], c("3"), ctx).action).toBe(
      "Double",
    );
    expect(basicStrategyAdvice([c("4"), c("5")], c("6"), ctx).action).toBe(
      "Double",
    );
    expect(basicStrategyAdvice([c("4"), c("5")], c("2"), ctx).action).toBe(
      "Hit",
    );
    expect(basicStrategyAdvice([c("4"), c("5")], c("7"), ctx).action).toBe(
      "Hit",
    );
  });
  it("soft 18 (A,7) doubles vs 3-6", () => {
    expect(basicStrategyAdvice([c("A"), c("7")], c("3"), ctx).action).toBe(
      "Double",
    );
    expect(basicStrategyAdvice([c("A"), c("7")], c("6"), ctx).action).toBe(
      "Double",
    );
    // vs 2,7,8 → Stand (no double)
    expect(basicStrategyAdvice([c("A"), c("7")], c("2"), ctx).action).toBe(
      "Stand",
    );
  });
  it("does not double when canDouble is false (falls back to Hit)", () => {
    expect(basicStrategyAdvice([c("6"), c("5")], c("10")).action).toBe("Hit");
  });
  it("does not double after a hit (3+ cards)", () => {
    expect(
      basicStrategyAdvice([c("3"), c("3"), c("5")], c("10"), ctx).action,
    ).toBe("Hit");
  });
});
