"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/storage";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getUser() ? "/play" : "/login");
  }, [router]);
  return (
    <main className="felt min-h-screen grid place-items-center">
      <div className="text-emerald-100/70">Loading…</div>
    </main>
  );
}
