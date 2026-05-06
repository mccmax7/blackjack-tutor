import type { Card as CardType } from "@/types";

interface Props {
  card?: CardType;
  faceDown?: boolean;
}

export function Card({ card, faceDown = false }: Props) {
  if (faceDown || !card) {
    return (
      <div
        className="relative h-32 w-24 rounded-lg shadow-card border border-slate-900/40 bg-gradient-to-br from-rose-900 to-rose-950"
        aria-label="face-down card"
      >
        <div className="absolute inset-2 rounded-md border border-rose-300/20 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.06)_0_6px,transparent_6px_12px)]" />
      </div>
    );
  }

  const isRed = card.suit === "♥" || card.suit === "♦";
  const colorClass = isRed ? "text-rose-600" : "text-slate-900";

  return (
    <div
      className={`relative h-32 w-24 rounded-lg shadow-card border border-slate-900/20 bg-white ${colorClass}`}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <div className="absolute top-1.5 left-2 leading-none">
        <div className="text-lg font-bold">{card.rank}</div>
        <div className="text-base">{card.suit}</div>
      </div>
      <div className="absolute inset-0 grid place-items-center text-4xl">
        {card.suit}
      </div>
      <div className="absolute bottom-1.5 right-2 rotate-180 leading-none">
        <div className="text-lg font-bold">{card.rank}</div>
        <div className="text-base">{card.suit}</div>
      </div>
    </div>
  );
}
