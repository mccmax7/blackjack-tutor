import type { UserStats } from "@/types";

interface Props {
  budget: number;
  stats: UserStats;
}

export function Bankroll({ budget, stats }: Props) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-[10px] uppercase tracking-widest text-emerald-200/70">
          Bankroll
        </span>
        <span className="text-amber-300 font-bold text-xl tabular-nums">
          ${budget.toLocaleString()}
        </span>
      </div>
      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-[10px] uppercase tracking-widest text-emerald-200/70">
          Record
        </span>
        <span
          className="text-emerald-50 text-sm tabular-nums"
          aria-label={`Wins ${stats.wins}, losses ${stats.losses}, pushes ${stats.pushes}, blackjacks ${stats.blackjacks}`}
        >
          <span className="text-emerald-300">W {stats.wins}</span>
          <span className="text-emerald-200/50"> · </span>
          <span className="text-rose-300">L {stats.losses}</span>
          <span className="text-emerald-200/50"> · </span>
          <span className="text-amber-200">P {stats.pushes}</span>
          {stats.blackjacks > 0 && (
            <>
              <span className="text-emerald-200/50"> · </span>
              <span className="text-amber-300">BJ {stats.blackjacks}</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
