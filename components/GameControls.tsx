interface Props {
  canHit: boolean;
  canStand: boolean;
  canDeal: boolean;
  bet: number;
  onHit: () => void;
  onStand: () => void;
  onDeal: () => void;
}

export function GameControls({
  canHit,
  canStand,
  canDeal,
  bet,
  onHit,
  onStand,
  onDeal,
}: Props) {
  return (
    <div className="flex gap-3 justify-center flex-wrap">
      <ActionButton onClick={onHit} disabled={!canHit} variant="primary">
        Hit
      </ActionButton>
      <ActionButton onClick={onStand} disabled={!canStand} variant="primary">
        Stand
      </ActionButton>
      <ActionButton onClick={onDeal} disabled={!canDeal} variant="gold">
        Deal {bet > 0 ? `$${bet}` : ""}
      </ActionButton>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "primary" | "gold";
}) {
  const base =
    "px-6 py-2.5 rounded-full font-semibold tracking-wide shadow-chip transition disabled:opacity-40 disabled:cursor-not-allowed";
  const palette =
    variant === "gold"
      ? "bg-chip-gold text-slate-900 hover:bg-yellow-300"
      : "bg-emerald-700 text-white hover:bg-emerald-600";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${palette}`}
    >
      {children}
    </button>
  );
}
