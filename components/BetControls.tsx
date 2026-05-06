interface Props {
  bet: number;
  budget: number;
  onChange: (bet: number) => void;
  disabled?: boolean;
}

const CHIPS: { value: number; classes: string }[] = [
  { value: 5, classes: "bg-rose-200 text-rose-900 ring-rose-500/40" },
  { value: 25, classes: "bg-emerald-200 text-emerald-900 ring-emerald-500/40" },
  { value: 100, classes: "bg-slate-200 text-slate-900 ring-slate-500/40" },
];

export function BetControls({ bet, budget, onChange, disabled }: Props) {
  const handleChip = (value: number) => {
    if (disabled) return;
    const next = Math.min(bet + value, budget);
    onChange(next);
  };
  const handleClear = () => {
    if (disabled) return;
    onChange(0);
  };
  const handleAllIn = () => {
    if (disabled) return;
    onChange(budget);
  };

  return (
    <div
      className={`flex flex-col items-center gap-3 ${disabled ? "opacity-60" : ""}`}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] uppercase tracking-widest text-emerald-200/70">
          Bet
        </span>
        <span className="text-amber-300 font-bold text-2xl tabular-nums min-w-[3ch] text-center">
          ${bet}
        </span>
      </div>
      <div className="flex gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => handleChip(chip.value)}
            disabled={disabled || bet + chip.value > budget}
            className={`h-12 w-12 rounded-full font-bold text-sm shadow-chip ring-4 hover:scale-105 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed ${chip.classes}`}
          >
            {chip.value}
          </button>
        ))}
        <button
          type="button"
          onClick={handleAllIn}
          disabled={disabled || budget === 0 || bet === budget}
          className="h-12 px-3 rounded-full bg-amber-500/90 text-amber-950 font-semibold text-xs shadow-chip ring-4 ring-amber-300/30 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          All in
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || bet === 0}
          className="h-12 px-3 rounded-full bg-slate-700/80 text-emerald-50 font-semibold text-xs ring-1 ring-emerald-200/20 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
