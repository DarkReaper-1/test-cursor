"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cta } from "@/components/ui/Shell";
import type { PromotionDto, PromotionResult } from "@/lib/types";

export function PromoteClient({ promotion }: { promotion: PromotionDto }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<PromotionResult | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/rank/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as PromotionResult & { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Promotion is not available.");
      }
      setAccepted(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promotion failed.");
    } finally {
      setBusy(false);
    }
  };

  if (accepted) {
    return (
      <div>
        <p className="font-mono text-[10px] tracking-[0.28em] text-amber">RANK ACCEPTED</p>
        <h1 className="mt-3 font-display text-4xl leading-none">{accepted.to}</h1>
        <p className="mt-5 font-display text-2xl text-paper">{accepted.identity}</p>
        <p className="mt-4 font-mono text-[10px] tracking-[0.18em] text-steel">
          LEVEL {accepted.player.level} · {accepted.player.rank}
        </p>
        {accepted.achievementUnlocks.length > 0 ? (
          <div className="mt-8 space-y-5">
            {accepted.achievementUnlocks.map((item) => (
              <div key={item.id}>
                <p className="font-mono text-[10px] tracking-[0.22em] text-amber">ACHIEVEMENT UNLOCKED</p>
                <p className="mt-2 font-display text-3xl">{item.title}</p>
                <p className="mt-1 text-sm text-steel">{item.identity}</p>
                <p className="mt-2 font-display text-2xl tabular-nums">+{item.xp} XP</p>
              </div>
            ))}
          </div>
        ) : null}
        {accepted.promotion.available && accepted.promotion.to ? (
          <p className="mt-8 text-sm text-steel">
            {accepted.promotion.to} is available. Recognition is still yours to accept.
          </p>
        ) : null}
        <Cta type="button" onClick={() => router.push("/")}>
          Continue
        </Cta>
      </div>
    );
  }

  if (!promotion.to) {
    return (
      <div>
        <p className="font-mono text-[10px] tracking-[0.28em] text-amber">RANK</p>
        <h1 className="mt-3 font-display text-4xl leading-none">{promotion.from}</h1>
        <p className="mt-5 font-display text-2xl">The system has nothing higher.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.28em] text-amber">PROMOTION</p>
      <h1 className="mt-3 font-display text-4xl leading-none">{promotion.to}</h1>
      <p className="mt-3 text-sm text-steel">
        Level is earned through XP. Rank is accepted status.
      </p>
      <ul className="mt-8 space-y-4">
        {promotion.requirements.map((row) => (
          <li key={row.key} className="flex items-baseline justify-between gap-4">
            <span className="font-mono text-[10px] tracking-[0.18em] text-steel">{row.label}</span>
            <span className={row.met ? "font-display text-xl text-paper" : "font-display text-xl text-steel"}>
              {row.current}/{row.target}
            </span>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-4 text-sm text-amber">{error}</p> : null}
      {promotion.available ? (
        <Cta type="button" disabled={busy} onClick={() => void accept()}>
          {busy ? "Accepting…" : `Accept ${promotion.to}`}
        </Cta>
      ) : (
        <p className="mt-8 font-mono text-[10px] tracking-[0.18em] text-steel">REQUIREMENTS NOT MET</p>
      )}
    </div>
  );
}
