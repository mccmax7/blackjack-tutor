export type BannerTone = "win" | "loss" | "push" | "blackjack";

interface Props {
  show: boolean;
  message?: string;
  tone?: BannerTone;
  delta?: number; // net change to bankroll (can be negative)
}

export function ResultBanner({ show, message, tone, delta }: Props) {
  if (!show || !message) {
    return <div className="h-20" aria-hidden />;
  }
  const toneClasses = toneFor(tone);
  const showDelta = typeof delta === "number" && delta !== 0;
  const positive = (delta ?? 0) > 0;
  const isBJ = tone === "blackjack";
  return (
    <div
      key={(tone ?? "neutral") + (delta ?? 0)}
      role="status"
      className={`banner-pop-in min-h-20 flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 ${toneClasses.banner}`}
    >
      <span className="text-xl font-bold tracking-wide">{message}</span>
      {showDelta && (
        <span
          data-flight-source
          className={`delta-pop text-4xl md:text-5xl font-extrabold tabular-nums drop-shadow ${toneClasses.delta} ${isBJ ? "animate-pulse" : ""}`}
        >
          {positive ? `+$${delta}` : `-$${Math.abs(delta as number)}`}
        </span>
      )}
    </div>
  );
}

function toneFor(tone?: BannerTone): { banner: string; delta: string } {
  switch (tone) {
    case "blackjack":
      return {
        banner: "bg-amber-400/90 text-amber-950",
        delta: "text-amber-50 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]",
      };
    case "win":
      return {
        banner: "bg-emerald-500/90 text-emerald-950",
        delta: "text-emerald-50 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]",
      };
    case "push":
      return {
        banner: "bg-amber-300/90 text-amber-950",
        delta: "text-amber-900",
      };
    case "loss":
      return {
        banner: "bg-rose-600/90 text-rose-50",
        delta: "text-rose-50 drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]",
      };
    default:
      return { banner: "bg-transparent", delta: "" };
  }
}
