"use client";

import { useEffect, useState } from "react";

interface Props {
  flightKey: number;
  delta: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  onDone: () => void;
}

const DURATION_MS = 520;

export function DeltaFlight({
  flightKey,
  delta,
  from,
  to,
  onDone,
}: Props) {
  const [phase, setPhase] = useState<"start" | "end">("start");

  useEffect(() => {
    setPhase("start");
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPhase("end"));
    });
    const done = window.setTimeout(onDone, DURATION_MS + 40);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(done);
    };
  }, [flightKey, onDone]);

  const positive = delta > 0;
  const isStart = phase === "start";

  return (
    <div
      aria-hidden
      className={`fixed pointer-events-none z-[60] font-bold tabular-nums px-3 py-1 rounded-full text-2xl shadow-lg ${
        positive
          ? "bg-emerald-500 text-emerald-50 ring-2 ring-emerald-200/60"
          : "bg-rose-600 text-rose-50 ring-2 ring-rose-200/60"
      }`}
      style={{
        left: isStart ? from.x : to.x,
        top: isStart ? from.y : to.y,
        transform: `translate(-50%, -50%) scale(${isStart ? 1 : 0.55})`,
        opacity: isStart ? 1 : 0,
        transition: isStart
          ? "none"
          : `left ${DURATION_MS}ms cubic-bezier(0.4,0,0.6,1), top ${DURATION_MS}ms cubic-bezier(0.4,0,0.6,1), transform ${DURATION_MS}ms cubic-bezier(0.4,0,0.6,1), opacity ${DURATION_MS}ms ease-in`,
      }}
    >
      {positive ? `+$${delta}` : `-$${Math.abs(delta)}`}
    </div>
  );
}
