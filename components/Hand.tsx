import type { Card as CardType } from "@/types";
import { Card } from "./Card";
import { handTotal } from "@/lib/hand";

interface Props {
  cards: CardType[];
  hideSecond?: boolean;
  label: string;
}

export function Hand({ cards, hideSecond = false, label }: Props) {
  const totalInfo =
    cards.length === 0
      ? null
      : hideSecond
        ? handTotal([cards[0]])
        : handTotal(cards);

  let totalLabel = "—";
  if (totalInfo) {
    totalLabel =
      totalInfo.isSoft && cards.length >= 2 && !hideSecond
        ? `Soft ${totalInfo.total}`
        : `${totalInfo.total}`;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-sm tracking-widest uppercase text-emerald-100/80">
        {label}
      </div>
      <div className="flex gap-2 min-h-32">
        {cards.map((c, i) => (
          <div
            key={`${c.rank}-${c.suit}-${i}`}
            className="card-deal-in [transform-origin:center_center]"
          >
            <Card card={c} faceDown={hideSecond && i === 1} />
          </div>
        ))}
        {cards.length === 0 && (
          <div className="opacity-50">
            <Card faceDown />
          </div>
        )}
      </div>
      <div className="rounded-full bg-black/40 text-emerald-50 px-3 py-0.5 text-sm font-semibold">
        {hideSecond ? `Showing ${totalLabel}` : `Total: ${totalLabel}`}
      </div>
    </div>
  );
}
