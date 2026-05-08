interface Props {
  canHit: boolean;
  canStand: boolean;
  canDeal: boolean;
  canDouble: boolean;
  canSplit: boolean;
  bet: number;
  onHit: () => void;
  onStand: () => void;
  onDeal: () => void;
  onDouble: () => void;
  onSplit: () => void;
}

export function GameControls({
  canHit,
  canStand,
  canDeal,
  canDouble,
  canSplit,
  bet,
  onHit,
  onStand,
  onDeal,
  onDouble,
  onSplit,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      <ActionButton onClick={onHit} disabled={!canHit} variant="primary">
        Hit
      </ActionButton>
      <ActionButton onClick={onStand} disabled={!canStand} variant="primary">
        Stand
      </ActionButton>
      <ActionButton onClick={onDeal} disabled={!canDeal} variant="gold">
        Deal {bet > 0 ? `$${bet}` : ""}
      </ActionButton>
      <span
        aria-hidden
        className="hidden sm:block w-px h-8 bg-emerald-200/20 mx-2"
      />
      <ActionButton
        onClick={onDouble}
        disabled={!canDouble}
        variant="accent"
        title="Double down — double your bet, take exactly one more card."
      >
        Double
      </ActionButton>
      <ActionButton
        onClick={onSplit}
        disabled={!canSplit}
        variant="accent"
        title="Split — turn your pair into two hands."
      >
        Split
      </ActionButton>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "primary" | "gold" | "accent";
  title?: string;
}) {
  const base =
    "rounded-full font-semibold tracking-wide shadow-chip transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]";
  let palette: string;
  let size: string;
  if (variant === "gold") {
    palette = "bg-chip-gold text-slate-900 hover:bg-yellow-300";
    size = "px-7 py-2.5";
  } else if (variant === "accent") {
    palette =
      "bg-indigo-600/90 text-white hover:bg-indigo-500 ring-1 ring-indigo-400/50 text-sm font-medium";
    size = "px-4 py-1.5";
  } else {
    palette = "bg-emerald-700 text-white hover:bg-emerald-600";
    size = "px-7 py-2.5";
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${palette} ${size}`}
    >
      {children}
    </button>
  );
}
