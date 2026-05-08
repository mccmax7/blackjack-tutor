type Mode = "play" | "deal" | "none";

interface Props {
  mode: Mode;
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
  mode,
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
  if (mode === "none") return null;

  const showSecondary = mode === "play" && (canDouble || canSplit);

  return (
    <div className="flex flex-col items-center gap-3">
      {showSecondary && (
        <div className="flex gap-2 banner-pop-in" key={`${canDouble}-${canSplit}`}>
          {canDouble && (
            <SecondaryButton
              onClick={onDouble}
              title="Double down — double your bet, take exactly one more card."
            >
              Double
            </SecondaryButton>
          )}
          {canSplit && (
            <SecondaryButton
              onClick={onSplit}
              title="Split — turn your pair into two hands."
            >
              Split
            </SecondaryButton>
          )}
        </div>
      )}
      <div className="flex gap-3">
        {mode === "play" ? (
          <>
            <PrimaryButton onClick={onHit}>Hit</PrimaryButton>
            <PrimaryButton onClick={onStand}>Stand</PrimaryButton>
          </>
        ) : (
          <GoldButton onClick={onDeal} disabled={!canDeal}>
            Deal {bet > 0 ? `$${bet}` : ""}
          </GoldButton>
        )}
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-7 py-2.5 rounded-full bg-emerald-700 text-white font-semibold tracking-wide shadow-chip hover:bg-emerald-600 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="px-4 py-1.5 rounded-full bg-indigo-600/90 text-white font-medium text-sm shadow-chip ring-1 ring-indigo-400/50 hover:bg-indigo-500 active:scale-[0.97] transition"
    >
      {children}
    </button>
  );
}

function GoldButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-7 py-2.5 rounded-full bg-chip-gold text-slate-900 font-semibold tracking-wide shadow-chip hover:bg-yellow-300 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
