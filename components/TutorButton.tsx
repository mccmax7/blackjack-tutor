interface Props {
  onClick: () => void;
  disabled?: boolean;
}

export function TutorButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Get tutor advice"
      title="Get tutor advice"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-chip-gold text-slate-900 text-2xl font-bold shadow-chip ring-4 ring-amber-200/40 hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      ?
    </button>
  );
}
