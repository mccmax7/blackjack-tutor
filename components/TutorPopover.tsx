import type { TutorAdvice } from "@/types";

interface Props {
  advice: TutorAdvice | null;
  onClose: () => void;
}

export function TutorPopover({ advice, onClose }: Props) {
  if (!advice) return null;

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
      <div className="relative w-[90%] max-w-md rounded-2xl bg-slate-900 text-white shadow-2xl ring-1 ring-amber-200/30 p-6">
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
        </div>
        <div className="text-3xl font-bold mb-3">{advice.action}</div>
        <p className="text-emerald-50/90 leading-relaxed">{advice.reason}</p>
        <div className="mt-5 text-xs text-emerald-50/50">
          Based on basic blackjack strategy. Final call is yours.
        </div>
      </div>
    </div>
  );
}
