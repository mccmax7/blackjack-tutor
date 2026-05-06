"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Hand } from "@/components/Hand";
import { GameControls } from "@/components/GameControls";
import { TutorButton } from "@/components/TutorButton";
import { TutorPopover } from "@/components/TutorPopover";
import { ResultBanner } from "@/components/ResultBanner";
import { Bankroll } from "@/components/Bankroll";
import { BetControls } from "@/components/BetControls";
import {
  emptyState,
  hit,
  isTerminal,
  payoutFor,
  stand,
  startNewHand,
} from "@/lib/game";
import { basicStrategyAdvice } from "@/lib/strategy";
import {
  clearUser,
  emptyStats,
  getUser,
  setUser,
  STARTING_BUDGET,
} from "@/lib/storage";
import type { GameState, GameStatus, TutorAdvice, User } from "@/types";

const DEFAULT_BET = 25;

export default function PlayPage() {
  const router = useRouter();
  const [user, setUserState] = useState<User | null>(null);
  const [state, setState] = useState<GameState>(emptyState);
  const [advice, setAdvice] = useState<TutorAdvice | null>(null);
  const [pendingBet, setPendingBet] = useState<number>(0);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  // Increment per deal so settlement only fires once per hand.
  const handIdRef = useRef(0);
  const lastSettledHandRef = useRef(-1);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUserState(u);
    setPendingBet(Math.min(DEFAULT_BET, u.budget));
  }, [router]);

  // Settlement: when a hand reaches a terminal state, apply payout/stats once.
  useEffect(() => {
    if (!user) return;
    if (!isTerminal(state)) return;
    if (lastSettledHandRef.current === handIdRef.current) return;
    lastSettledHandRef.current = handIdRef.current;

    const payout = payoutFor(state);
    const delta = payout - state.bet;
    const next = applyResult(user, state.status, payout);
    setUserState(next);
    setUser(next);
    setLastDelta(delta);
    // Reset bet to last bet, capped by new budget. If broke, drop to 0.
    setPendingBet((b) => Math.min(b > 0 ? b : DEFAULT_BET, next.budget));
  }, [state, user]);

  if (!user) return null;

  const playerTurn = state.status === "player-turn";
  const terminal = isTerminal(state);
  const idle = state.status === "idle";
  const canDeal = (idle || terminal) && pendingBet > 0 && pendingBet <= user.budget;

  function onHit() {
    setState((s) => hit(s));
  }
  function onStand() {
    setState((s) => stand(s));
  }
  function onDeal() {
    if (!user) return;
    if (pendingBet <= 0 || pendingBet > user.budget) return;
    // Take the bet off the bankroll while the hand is live.
    const next = { ...user, budget: user.budget - pendingBet };
    setUserState(next);
    setUser(next);
    setAdvice(null);
    setLastDelta(null);
    handIdRef.current += 1;
    setState(startNewHand(pendingBet));
  }
  function onTutor() {
    if (!playerTurn || state.dealer.length === 0) return;
    setAdvice(basicStrategyAdvice(state.player, state.dealer[0]));
  }
  function onSignOut() {
    clearUser();
    router.replace("/login");
  }
  function onResetBankroll() {
    if (!user) return;
    if (!confirm("Reset bankroll and stats to start over?")) return;
    const next: User = {
      ...user,
      budget: STARTING_BUDGET,
      stats: emptyStats(),
    };
    setUserState(next);
    setUser(next);
    setPendingBet(Math.min(DEFAULT_BET, next.budget));
    setLastDelta(null);
    setState(emptyState());
  }

  const broke = user.budget === 0 && (idle || terminal);

  return (
    <main className="felt min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-emerald-200/10 gap-4">
        <div className="font-display text-amber-300 text-xl tracking-wide">
          Blackjack Tutor
        </div>
        <div className="flex items-center gap-5">
          <Bankroll budget={user.budget} stats={user.stats} />
          <div className="flex flex-col items-end text-xs text-emerald-100/70">
            <span>
              Hi,{" "}
              <span className="text-emerald-50 font-medium">{user.name}</span>
            </span>
            <div className="flex gap-3 mt-0.5">
              <button
                type="button"
                onClick={onResetBankroll}
                className="hover:text-emerald-50 hover:underline underline-offset-4"
              >
                Reset bankroll
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="hover:text-emerald-50 hover:underline underline-offset-4"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="flex-1 grid grid-rows-[auto_auto_1fr_auto] gap-6 p-6 md:p-10 max-w-4xl w-full mx-auto">
        <div className="flex justify-center">
          <Hand
            cards={state.dealer}
            hideSecond={state.holeHidden}
            label="Dealer"
          />
        </div>

        <ResultBanner
          status={state.status}
          delta={terminal ? (lastDelta ?? undefined) : undefined}
        />

        <div className="flex flex-col items-center gap-4 justify-end">
          <Hand cards={state.player} label="You" />
          {state.bet > 0 && (idle || terminal || playerTurn) && (
            <div className="rounded-full bg-amber-500/20 ring-1 ring-amber-300/40 text-amber-200 px-3 py-0.5 text-xs tabular-nums">
              On the table: ${state.bet}
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col gap-5 items-center">
          {(idle || terminal) && !broke && (
            <BetControls
              bet={pendingBet}
              budget={user.budget}
              onChange={setPendingBet}
            />
          )}
          {broke && (
            <div className="text-center text-rose-200">
              You're out of chips.{" "}
              <button
                type="button"
                onClick={onResetBankroll}
                className="underline underline-offset-4 hover:text-rose-50"
              >
                Reset bankroll
              </button>{" "}
              to keep playing.
            </div>
          )}
          <GameControls
            canHit={playerTurn}
            canStand={playerTurn}
            canDeal={canDeal}
            bet={pendingBet}
            onHit={onHit}
            onStand={onStand}
            onDeal={onDeal}
          />
        </div>
      </section>

      <TutorButton onClick={onTutor} disabled={!playerTurn} />
      <TutorPopover advice={advice} onClose={() => setAdvice(null)} />
    </main>
  );
}

function applyResult(user: User, status: GameStatus, payout: number): User {
  const stats = { ...user.stats };
  switch (status) {
    case "player-blackjack":
      stats.wins += 1;
      stats.blackjacks += 1;
      stats.handsPlayed += 1;
      break;
    case "dealer-bust":
    case "player-win":
      stats.wins += 1;
      stats.handsPlayed += 1;
      break;
    case "push":
      stats.pushes += 1;
      stats.handsPlayed += 1;
      break;
    case "player-bust":
    case "dealer-blackjack":
    case "dealer-win":
      stats.losses += 1;
      stats.handsPlayed += 1;
      break;
    default:
      // not terminal — shouldn't happen
      return user;
  }
  return { ...user, budget: user.budget + payout, stats };
}
