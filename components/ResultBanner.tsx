import type { GameStatus } from "@/types";

interface Props {
  status: GameStatus;
  delta?: number; // net change to bankroll for this hand (can be negative)
}

export function ResultBanner({ status, delta }: Props) {
  const message = messageFor(status);
  if (!message) {
    return <div className="h-14" aria-hidden />;
  }
  return (
    <div
      key={status + (delta ?? 0)}
      role="status"
      className={`banner-pop-in h-14 grid place-items-center rounded-xl px-4 text-xl font-bold tracking-wide ${toneFor(status)}`}
    >
      <span className="flex items-baseline gap-3">
        <span>{message}</span>
        {typeof delta === "number" && delta !== 0 && (
          <span className="text-base tabular-nums opacity-90">
            {delta > 0 ? `+$${delta}` : `-$${Math.abs(delta)}`}
          </span>
        )}
      </span>
    </div>
  );
}

function messageFor(status: GameStatus): string | null {
  switch (status) {
    case "player-blackjack":
      return "Blackjack! You win.";
    case "dealer-blackjack":
      return "Dealer has blackjack. You lose.";
    case "player-bust":
      return "Bust. You lose.";
    case "dealer-bust":
      return "Dealer busts. You win!";
    case "player-win":
      return "You win!";
    case "dealer-win":
      return "Dealer wins.";
    case "push":
      return "Push — it's a tie.";
    default:
      return null;
  }
}

function toneFor(status: GameStatus): string {
  switch (status) {
    case "player-blackjack":
    case "dealer-bust":
    case "player-win":
      return "bg-emerald-500/90 text-emerald-950";
    case "push":
      return "bg-amber-300/90 text-amber-950";
    case "player-bust":
    case "dealer-blackjack":
    case "dealer-win":
      return "bg-rose-600/90 text-rose-50";
    default:
      return "bg-transparent";
  }
}
