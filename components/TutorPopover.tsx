import type { TutorAction, TutorAdvice } from "@/types";

interface Props {
  advice: TutorAdvice | null;
  loading?: boolean;
  source?: "basic" | "ai";
  onClose: () => void;
}

const ACTION_STYLES: Record<
  TutorAction,
  { text: string; chip: string; ring: string }
> = {
  Hit: {
    text: "text-emerald-300",
    chip: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/40",
    ring: "ring-emerald-400/40",
  },
  Stand: {
    text: "text-rose-300",
    chip: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/40",
    ring: "ring-rose-400/40",
  },
  Double: {
    text: "text-indigo-300",
    chip: "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/40",
    ring: "ring-indigo-400/40",
  },
  Split: {
    text: "text-amber-300",
    chip: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/40",
    ring: "ring-amber-400/40",
  },
};

export function TutorPopover({ advice, loading, source, onClose }: Props) {
  if (!advice && !loading) return null;

  const styles = advice ? ACTION_STYLES[advice.action] : null;
  const ringClass = styles?.ring ?? "ring-amber-200/30";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutor advice"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative w-[90%] max-w-md rounded-2xl bg-slate-900 text-white shadow-2xl ring-1 ${ringClass} p-6`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tutor advice"
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center text-lg"
        >
          ×
        </button>
        <div className="text-xs uppercase tracking-widest text-amber-300 mb-1">
          Tutor advice
          {source === "ai" && (
            <span className="ml-2 rounded bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/40 px-1.5 py-0.5 text-[10px] tracking-normal">
              AI
            </span>
          )}
        </div>
        {loading || !advice || !styles ? (
          <div className="flex items-center gap-3 py-4">
            <span className="h-3 w-3 rounded-full bg-amber-300 animate-ping" />
            <span className="text-emerald-50/80">Thinking…</span>
          </div>
        ) : (
          <>
            <div
              className={`inline-flex items-center rounded-full px-3 py-1 text-3xl font-bold mb-3 ${styles.chip}`}
            >
              {advice.action}
            </div>
            <p className={`leading-relaxed ${styles.text}`}>{advice.reason}</p>
          </>
        )}
        <div className="mt-5 text-xs text-emerald-50/50">
          {source === "ai"
            ? "Suggested by Claude using basic strategy. Final call is yours."
            : "Based on basic blackjack strategy. Final call is yours."}
        </div>
      </div>
    </div>
  );
}
