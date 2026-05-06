"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyStats, getUser, setUser, STARTING_BUDGET } from "@/lib/storage";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getUser()) router.replace("/play");
  }, [router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length < 1) {
      setError("Please enter your name.");
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setUser({
      name: trimmedName,
      email: trimmedEmail,
      budget: STARTING_BUDGET,
      stats: emptyStats(),
    });
    router.push("/play");
  }

  return (
    <main className="felt min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900/70 backdrop-blur ring-1 ring-emerald-200/20 shadow-2xl p-7">
        <h1 className="font-display text-3xl text-amber-300 tracking-wide mb-1">
          Blackjack Tutor
        </h1>
        <p className="text-emerald-100/70 mb-6 text-sm">
          Practice blackjack with on-demand strategy advice. No signup, no
          money — just play.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Name"
            value={name}
            onChange={setName}
            placeholder="Jane Doe"
            type="text"
            autoComplete="name"
          />
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="jane@example.com"
            type="email"
            autoComplete="email"
          />
          {error && (
            <div role="alert" className="text-sm text-rose-300">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-full bg-chip-gold text-slate-900 font-semibold py-2.5 hover:bg-yellow-300 transition shadow-chip"
          >
            Start playing
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type: string;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-emerald-200/70 mb-1">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg bg-black/40 border border-emerald-200/20 px-3 py-2 text-emerald-50 placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
      />
    </label>
  );
}
