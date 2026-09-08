"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import type { WorkoutResult } from "@/lib/types";

export default function ResultPage() {
  const [result, setResult] = useState<WorkoutResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("system.lastResult");
    if (!raw) return;
    setResult(JSON.parse(raw) as WorkoutResult);
  }, []);

  if (!result) {
    return (
      <Shell>
        <p className="text-steel">No result on file.</p>
        <Link href="/" className="mt-4 inline-block text-amber">
          Today
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="font-mono text-[10px] tracking-[0.24em] text-amber">EVALUATION</p>
      <h1 className="mt-2 font-display text-4xl leading-none">
        {result.leveledUp ? "Level up." : "File updated."}
      </h1>
      <p className="mt-3 text-lg text-paper">+{result.xp} XP</p>
      {result.rankUp ? <p className="mt-2 text-amber">Rank → {result.player.rank}</p> : null}
      <ul className="mt-6 space-y-2 text-sm text-steel">
        {result.events.map((event, index) => (
          <li key={`${event.type}-${index}`}>{event.type.replaceAll("_", " ")}</li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-paper">
        LEVEL {result.player.level} · {result.player.rank} · STREAK {result.player.streak}
      </p>
      <Link
        href="/"
        className="mt-8 flex min-h-12 items-center justify-center rounded-md bg-paper text-sm font-semibold text-void"
      >
        Return to Today
      </Link>
    </Shell>
  );
}
