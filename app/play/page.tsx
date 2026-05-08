"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Hand } from "@/components/Hand";
import { GameControls } from "@/components/GameControls";
import { TutorButton } from "@/components/TutorButton";
import { TutorPopover } from "@/components/TutorPopover";
import { ResultBanner } from "@/components/ResultBanner";
import type { BannerTone } from "@/components/ResultBanner";
import { Bankroll } from "@/components/Bankroll";
import { BetControls } from "@/components/BetControls";
import { DeltaFlight } from "@/components/DeltaFlight";
import { Confetti } from "@/components/Confetti";
import {
  activeHand,
  canDouble as canDoubleAction,
  canSplit as canSplitAction,
  dealTo,
  dealerHit,
  dealerShouldStop,
  doubleDown,
  emptyState,
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
import { aiTutorAdvice, basicStrategyAdvice } from "@/lib/strategy";
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
import type { GameState, PlayerHand, TutorAdvice, User } from "@/types";

const DEFAULT_BET = 25;
const DEAL_INTERVAL_MS = 240;
const DEALER_HIT_DELAY_MS = 600;
const DEALER_SETTLE_DELAY_MS = 800;
const FLIGHT_LAUNCH_DELAY_MS = 220;

interface Flight {
  key: number;
  delta: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export default function PlayPage() {
  const router = useRouter();
  const [user, setUserState] = useState<User | null>(null);
  const [state, setState] = useState<GameState>(emptyState);
  const [advice, setAdvice] = useState<TutorAdvice | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [tutorMode, setTutorMode] = useState<"basic" | "ai">("basic");
  const [pendingBet, setPendingBet] = useState<number>(0);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [displayedBudget, setDisplayedBudget] = useState<number | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [bankrollPulse, setBankrollPulse] = useState<{
    key: number;
    tone: "win" | "loss";
  } | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const handIdRef = useRef(0);
  const lastSettledHandRef = useRef(-1);
  const flightKeyRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const canPersistRef = useRef(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUserState(u);
    setPendingBet(Math.min(DEFAULT_BET, u.budget));
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("blackjack-tutor:tutor-mode");
      if (saved === "ai" || saved === "basic") setTutorMode(saved);
    }

    const saved = getGameState();
    if (saved && saved.status !== "idle") {
      let restored = saved;
      if (restored.status === "dealing") {
        // Finish a deal that was interrupted by reload.
        while (
          (restored.hands[0]?.cards.length ?? 0) +
            restored.dealer.length <
          4
        ) {
          const playerCount = restored.hands[0]?.cards.length ?? 0;
          const target =
            playerCount === restored.dealer.length ? "player" : "dealer";
          restored = dealTo(restored, target);
        }
        restored = finalizeOpening(restored);
      }
      setState(restored);
      if (isTerminal(restored)) {
        lastSettledHandRef.current = handIdRef.current;
      }
    }
    canPersistRef.current = true;
  }, [router]);

  // Persist game state on every change so a refresh restores the hand.
  useEffect(() => {
    if (!canPersistRef.current) return;
    if (state.status === "idle") {
      clearGameState();
    } else {
      setGameState(state);
    }
  }, [state]);

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  // Settlement: when a hand reaches a terminal state, apply payouts/stats once.
  useEffect(() => {
    if (!user) return;
    if (!isTerminal(state)) return;
    if (lastSettledHandRef.current === handIdRef.current) return;
    lastSettledHandRef.current = handIdRef.current;

    const payout = payoutFor(state);
    const delta = netDelta(state);
    const next = applyResult(user, state.hands, payout);
    setUserState(next);
    setUser(next);
    setLastDelta(delta);
    setPendingBet((b) => Math.min(b > 0 ? b : DEFAULT_BET, next.budget));
    if (delta !== 0) setDisplayedBudget(user.budget);
    if (state.hands.some((h) => h.result === "blackjack")) {
      setConfettiKey((k) => k + 1);
    }
  }, [state, user]);

  // Spawn flying chip once the banner has rendered with the delta.
  useEffect(() => {
    if (lastDelta == null || lastDelta === 0) return;
    const delta = lastDelta;
    const id = window.setTimeout(() => {
      const fromEl = document.querySelector<HTMLElement>(
        "[data-flight-source]",
      );
      const toEl = document.querySelector<HTMLElement>(
        "[data-flight-target]",
      );
      if (!fromEl || !toEl) {
        setDisplayedBudget(null);
        return;
      }
      const a = fromEl.getBoundingClientRect();
      const b = toEl.getBoundingClientRect();
      flightKeyRef.current += 1;
      setFlight({
        key: flightKeyRef.current,
        delta,
        from: { x: a.left + a.width / 2, y: a.top + a.height / 2 },
        to: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
      });
    }, FLIGHT_LAUNCH_DELAY_MS);
    timersRef.current.push(id);
    return () => clearTimeout(id);
  }, [lastDelta]);

  function onFlightDone() {
    setFlight(null);
    setDisplayedBudget(null);
    if (lastDelta != null && lastDelta !== 0) {
      setBankrollPulse({
        key: flightKeyRef.current,
        tone: lastDelta > 0 ? "win" : "loss",
      });
    }
  }

  // Dealer turn: hit one card per tick until 17+, then settle.
  useEffect(() => {
    if (state.status !== "dealer-turn") return;
    const stopping = dealerShouldStop(state);
    const id = window.setTimeout(
      () => {
        setState((s) => {
          if (s.status !== "dealer-turn") return s;
          return dealerShouldStop(s) ? settle(s) : dealerHit(s);
        });
      },
      stopping ? DEALER_SETTLE_DELAY_MS : DEALER_HIT_DELAY_MS,
    );
    return () => clearTimeout(id);
  }, [state]);

  if (!user) return null;

  const playerTurn = state.status === "player-turn";
  const idle = state.status === "idle";
  const dealing = state.status === "dealing";
  const terminal = isTerminal(state);
  const onTable = totalCommitted(state);
  const canDeal =
    (idle || terminal) && pendingBet > 0 && pendingBet <= user.budget;
  const canDouble = playerTurn && canDoubleAction(state, user.budget);
  const canSplit = playerTurn && canSplitAction(state, user.budget);

  function clearAllTimers() {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }
  function schedule(fn: () => void, delay: number) {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, delay);
    timersRef.current.push(id);
  }

  function onHit() {
    if (!playerTurn) return;
    setState((s) => hit(s));
  }
  function onStand() {
    if (!playerTurn) return;
    setState((s) => standCurrentHand(s));
  }
  function onDouble() {
    if (!user || !canDouble) return;
    const cur = activeHand(state);
    if (!cur) return;
    const additional = cur.bet;
    const next = { ...user, budget: user.budget - additional };
    setUserState(next);
    setUser(next);
    setState((s) => doubleDown(s));
  }
  function onSplit() {
    if (!user || !canSplit) return;
    const cur = activeHand(state);
    if (!cur) return;
    const additional = cur.bet;
    const next = { ...user, budget: user.budget - additional };
    setUserState(next);
    setUser(next);
    setState((s) => splitPair(s));
  }
  function onDeal() {
    if (!user) return;
    if (pendingBet <= 0 || pendingBet > user.budget) return;
    clearAllTimers();
    const next = { ...user, budget: user.budget - pendingBet };
    setUserState(next);
    setUser(next);
    setAdvice(null);
    setLastDelta(null);
    setFlight(null);
    setDisplayedBudget(null);
    handIdRef.current += 1;
    setState(openingDeal(pendingBet));

    const sequence: ("player" | "dealer")[] = [
      "player",
      "dealer",
      "player",
      "dealer",
    ];
    sequence.forEach((to, i) => {
      schedule(() => {
        setState((s) => (s.status === "dealing" ? dealTo(s, to) : s));
      }, (i + 1) * DEAL_INTERVAL_MS);
    });
    schedule(
      () => {
        setState((s) => (s.status === "dealing" ? finalizeOpening(s) : s));
      },
      (sequence.length + 1) * DEAL_INTERVAL_MS,
    );
  }
  function onTutor() {
    if (!playerTurn || state.dealer.length === 0) return;
    if (adviceLoading) return;
    const cur = activeHand(state);
    if (!cur) return;
    const ctx = { canDouble, canSplit };
    if (tutorMode === "ai") {
      setAdvice(null);
      setAdviceLoading(true);
      aiTutorAdvice(cur.cards, state.dealer[0], ctx)
        .then((res) => setAdvice(res))
        .finally(() => setAdviceLoading(false));
    } else {
      setAdvice(basicStrategyAdvice(cur.cards, state.dealer[0], ctx));
    }
  }
  function toggleTutorMode() {
    setTutorMode((prev) => {
      const next = prev === "ai" ? "basic" : "ai";
      if (typeof window !== "undefined") {
        window.localStorage.setItem("blackjack-tutor:tutor-mode", next);
      }
      return next;
    });
  }
  function onSignOut() {
    clearAllTimers();
    clearUser();
    clearGameState();
    router.replace("/login");
  }
  function onResetBankroll() {
    if (!user) return;
    if (!confirm("Reset bankroll and stats to start over?")) return;
    clearAllTimers();
    clearGameState();
    const next: User = {
      ...user,
      budget: STARTING_BUDGET,
      stats: emptyStats(),
    };
    setUserState(next);
    setUser(next);
    setPendingBet(Math.min(DEFAULT_BET, next.budget));
    setLastDelta(null);
    setFlight(null);
    setDisplayedBudget(null);
    setState(emptyState());
  }

  const broke = user.budget === 0 && (idle || terminal);
  const bannerInfo = computeBanner(state, lastDelta);

  return (
    <main className="felt min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-emerald-200/10 gap-4">
        <div className="font-display text-amber-300 text-xl tracking-wide">
          Blackjack Tutor
        </div>
        <div className="flex items-center gap-5">
          <Bankroll
            budget={displayedBudget ?? user.budget}
            stats={user.stats}
            pulseKey={bankrollPulse?.key}
            pulseTone={bankrollPulse?.tone}
          />
          <div className="flex flex-col items-end text-xs text-emerald-100/70">
            <span>
              Hi,{" "}
              <span className="text-emerald-50 font-medium">{user.name}</span>
            </span>
            <div className="flex gap-3 mt-0.5 items-center">
              <button
                type="button"
                onClick={toggleTutorMode}
                title="Toggle between deterministic basic strategy and a Claude-powered tutor."
                className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ring-1 transition ${
                  tutorMode === "ai"
                    ? "bg-indigo-500/20 text-indigo-200 ring-indigo-400/40"
                    : "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30"
                }`}
              >
                Tutor: {tutorMode === "ai" ? "AI" : "Basic"}
              </button>
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
          show={terminal}
          message={bannerInfo.message}
          tone={bannerInfo.tone}
          delta={lastDelta ?? undefined}
        />

        <div className="flex flex-col items-center gap-4 justify-end">
          <PlayerHands
            hands={state.hands}
            activeHandIndex={state.activeHandIndex}
            playerTurn={playerTurn}
          />
          {onTable > 0 && !idle && (
            <div className="rounded-full bg-amber-500/20 ring-1 ring-amber-300/40 text-amber-200 px-3 py-0.5 text-xs tabular-nums">
              On the table: ${onTable}
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
            canDeal={canDeal && !dealing}
            canDouble={canDouble}
            canSplit={canSplit}
            bet={pendingBet}
            onHit={onHit}
            onStand={onStand}
            onDeal={onDeal}
            onDouble={onDouble}
            onSplit={onSplit}
          />
        </div>
      </section>

      <TutorButton
        onClick={onTutor}
        disabled={!playerTurn || adviceLoading}
      />
      <TutorPopover
        advice={advice}
        loading={adviceLoading}
        source={tutorMode}
        onClose={() => {
          setAdvice(null);
          setAdviceLoading(false);
        }}
      />
      {flight && (
        <DeltaFlight
          flightKey={flight.key}
          delta={flight.delta}
          from={flight.from}
          to={flight.to}
          onDone={onFlightDone}
        />
      )}
      <Confetti fireKey={confettiKey} />
    </main>
  );
}

function PlayerHands({
  hands,
  activeHandIndex,
  playerTurn,
}: {
  hands: PlayerHand[];
  activeHandIndex: number;
  playerTurn: boolean;
}) {
  if (hands.length === 0) {
    return <Hand cards={[]} label="You" />;
  }
  if (hands.length === 1) {
    const h = hands[0];
    return (
      <div className="flex flex-col items-center gap-2">
        <Hand cards={h.cards} label="You" />
        {h.result && (
          <HandResultChip result={h.result} bet={h.bet} doubled={h.status === "doubled"} />
        )}
      </div>
    );
  }
  return (
    <div className="flex gap-6 items-end flex-wrap justify-center">
      {hands.map((h, i) => {
        const active = playerTurn && i === activeHandIndex && h.status === "active";
        return (
          <div
            key={i}
            className={`flex flex-col items-center gap-2 transition-opacity ${
              h.status === "busted" ? "opacity-60" : ""
            } ${active ? "ring-2 ring-amber-300/60 rounded-2xl px-3 py-2" : ""}`}
          >
            <Hand cards={h.cards} label={`Hand ${i + 1}`} />
            <div className="text-[10px] text-emerald-100/70 tabular-nums">
              Bet ${h.bet}
              {h.status === "doubled" && " (doubled)"}
            </div>
            {h.result && <HandResultChip result={h.result} bet={h.bet} doubled={h.status === "doubled"} />}
          </div>
        );
      })}
    </div>
  );
}

function HandResultChip({
  result,
  bet,
  doubled,
}: {
  result: NonNullable<PlayerHand["result"]>;
  bet: number;
  doubled: boolean;
}) {
  const label =
    result === "blackjack"
      ? "Blackjack"
      : result === "win"
        ? "Win"
        : result === "loss"
          ? "Loss"
          : "Push";
  const tone =
    result === "blackjack" || result === "win"
      ? "bg-emerald-500/30 text-emerald-100 ring-emerald-300/40"
      : result === "push"
        ? "bg-amber-500/30 text-amber-100 ring-amber-300/40"
        : "bg-rose-500/30 text-rose-100 ring-rose-300/40";
  const handDelta =
    result === "blackjack"
      ? Math.floor(bet * 2.5) - bet
      : result === "win"
        ? bet
        : result === "loss"
          ? -bet
          : 0;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 tabular-nums ${tone}`}
    >
      {label}
      {handDelta !== 0 && (
        <span className="ml-1">
          {handDelta > 0 ? `+$${handDelta}` : `-$${Math.abs(handDelta)}`}
        </span>
      )}
      {doubled && <span className="ml-1 opacity-70">·2x</span>}
    </span>
  );
}

function computeBanner(
  state: GameState,
  delta: number | null,
): { message?: string; tone?: BannerTone } {
  if (state.status !== "settled") return {};
  const hands = state.hands;
  if (hands.length === 1) {
    const r = hands[0].result;
    if (r === "blackjack") return { message: "Blackjack!", tone: "blackjack" };
    if (r === "win") {
      const dealerBust = state.dealer.length > 0 && hands[0].status !== "busted"
        && handTotalSum(state.dealer) > 21;
      return {
        message: dealerBust ? "Dealer busts. You win!" : "You win!",
        tone: "win",
      };
    }
    if (r === "push") return { message: "Push — it's a tie.", tone: "push" };
    if (r === "loss") {
      const playerBust = hands[0].status === "busted";
      return {
        message: playerBust ? "Bust. You lose." : "Dealer wins.",
        tone: "loss",
      };
    }
    return {};
  }
  // Multi-hand summary
  const wins = hands.filter(
    (h) => h.result === "win" || h.result === "blackjack",
  ).length;
  const losses = hands.filter((h) => h.result === "loss").length;
  const pushes = hands.filter((h) => h.result === "push").length;
  const parts: string[] = [];
  if (wins) parts.push(`${wins} win${wins > 1 ? "s" : ""}`);
  if (pushes) parts.push(`${pushes} push${pushes > 1 ? "es" : ""}`);
  if (losses) parts.push(`${losses} loss${losses > 1 ? "es" : ""}`);
  const msg = parts.join(", ");
  let tone: BannerTone = "push";
  if (delta != null) {
    if (delta > 0) tone = "win";
    else if (delta < 0) tone = "loss";
  }
  return { message: msg || "Settled.", tone };
}

function handTotalSum(cards: { rank: string }[]): number {
  // Lightweight sum just for the message; full handTotal already used elsewhere.
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      total += 11;
      aces += 1;
    } else if (c.rank === "K" || c.rank === "Q" || c.rank === "J") {
      total += 10;
    } else {
      total += parseInt(c.rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function applyResult(user: User, hands: PlayerHand[], payout: number): User {
  const stats = { ...user.stats };
  for (const h of hands) {
    stats.handsPlayed += 1;
    switch (h.result) {
      case "blackjack":
        stats.wins += 1;
        stats.blackjacks += 1;
        break;
      case "win":
        stats.wins += 1;
        break;
      case "push":
        stats.pushes += 1;
        break;
      case "loss":
        stats.losses += 1;
        break;
    }
  }
  return { ...user, budget: user.budget + payout, stats };
}
