// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearGameState,
  clearUser,
  emptyStats,
  getGameState,
  getUser,
  setGameState,
  setUser,
  STARTING_BUDGET,
} from "@/lib/storage";
import type { GameState, User } from "@/types";

const fullUser: User = {
  name: "Jane",
  email: "jane@example.com",
  budget: 750,
  stats: { handsPlayed: 5, wins: 3, losses: 1, pushes: 1, blackjacks: 1 },
};

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe("getUser / setUser", () => {
  it("round-trips a full user", () => {
    setUser(fullUser);
    expect(getUser()).toEqual(fullUser);
  });

  it("returns null when nothing stored", () => {
    expect(getUser()).toBeNull();
  });

  it("migrates a legacy {name,email} record with sane defaults", () => {
    window.localStorage.setItem(
      "blackjack-tutor:user",
      JSON.stringify({ name: "Old", email: "old@example.com" }),
    );
    const u = getUser();
    expect(u).not.toBeNull();
    expect(u!.budget).toBe(STARTING_BUDGET);
    expect(u!.stats).toEqual(emptyStats());
  });

  it("survives corrupt JSON without throwing", () => {
    window.localStorage.setItem("blackjack-tutor:user", "{not json");
    expect(getUser()).toBeNull();
  });

  it("rejects records missing required fields", () => {
    window.localStorage.setItem("blackjack-tutor:user", JSON.stringify({}));
    expect(getUser()).toBeNull();
  });

  it("clearUser removes the record", () => {
    setUser(fullUser);
    clearUser();
    expect(getUser()).toBeNull();
  });
});

describe("getGameState / setGameState", () => {
  const gs: GameState = {
    deck: [{ rank: "A", suit: "♠" }],
    hands: [
      {
        cards: [{ rank: "10", suit: "♥" }],
        bet: 25,
        status: "active",
      },
    ],
    activeHandIndex: 0,
    dealer: [{ rank: "K", suit: "♦" }],
    status: "player-turn",
    holeHidden: true,
    bet: 25,
  };

  it("round-trips a game state", () => {
    setGameState(gs);
    expect(getGameState()).toEqual(gs);
  });

  it("clearGameState removes the record", () => {
    setGameState(gs);
    clearGameState();
    expect(getGameState()).toBeNull();
  });

  it("returns null on missing keys", () => {
    expect(getGameState()).toBeNull();
  });

  it("returns null when corrupted", () => {
    window.localStorage.setItem("blackjack-tutor:game", "{not json");
    expect(getGameState()).toBeNull();
  });

  it("rejects shape-invalid records", () => {
    window.localStorage.setItem(
      "blackjack-tutor:game",
      JSON.stringify({ deck: "not-an-array" }),
    );
    expect(getGameState()).toBeNull();
  });
});
