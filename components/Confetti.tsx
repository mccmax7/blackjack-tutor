"use client";

import { useEffect, useMemo, useState } from "react";

interface Props {
  fireKey: number; // change this to (re)trigger
}

interface Piece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  drift: number;
  rot: number;
  size: number;
  thin: number;
}

const COLORS = [
  "#fbbf24", // amber
  "#10b981", // emerald
  "#f43f5e", // rose
  "#3b82f6", // blue
  "#a855f7", // violet
  "#ffffff",
];
const PIECES = 70;
const LIFETIME_MS = 2600;

function makePieces(): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 250,
    duration: 1500 + Math.random() * 1100,
    color: COLORS[i % COLORS.length],
    drift: (Math.random() - 0.5) * 260,
    rot: Math.random() * 720 - 360,
    size: 6 + Math.random() * 8,
    thin: 0.35 + Math.random() * 0.4,
  }));
}

export function Confetti({ fireKey }: Props) {
  const [active, setActive] = useState(false);
  const pieces = useMemo<Piece[]>(
    () => (fireKey ? makePieces() : []),
    [fireKey],
  );

  useEffect(() => {
    if (!fireKey) return;
    setActive(true);
    const id = window.setTimeout(() => setActive(false), LIFETIME_MS);
    return () => clearTimeout(id);
  }, [fireKey]);

  if (!active || pieces.length === 0) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none z-[55] overflow-hidden"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-[-4%]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * p.thin,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            ["--cf-drift" as string]: `${p.drift}px`,
            ["--cf-rot" as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
