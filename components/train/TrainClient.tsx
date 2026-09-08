"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cta, Shell, inputClass } from "@/components/ui/Shell";
import type { TrainingDirective } from "@/lib/types";

type Draft = { exerciseId: string; sets: string; reps: string; weight: string };

export function TrainClient() {
  const router = useRouter();
  const [directive, setDirective] = useState<TrainingDirective | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [minutes, setMinutes] = useState("20");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/today")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load today’s directive.");
        const data = (await response.json()) as { directive: TrainingDirective };
        setDirective(data.directive);
        setDrafts(
          data.directive.exercises.map((item) => ({
            exerciseId: item.exerciseId,
            sets: String(item.targetSets),
            reps: String(item.targetReps),
            weight: String(item.targetLoad),
          })),
        );
        setMinutes(String(data.directive.minutes));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Load failed."));
  }, []);

  const complete = async () => {
    if (!directive) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          durationSec: Math.max(60, Number(minutes) * 60),
          exercises: drafts.map((row) => ({
            exerciseId: row.exerciseId,
            sets: Number(row.sets),
            reps: Number(row.reps),
            weight: Number(row.weight) || 0,
          })),
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Could not complete.");
      }
      router.push("/result");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <a href="/" className="text-sm text-amber">
        Today
      </a>
      <h1 className="mt-3 font-display text-4xl leading-none">{directive?.title ?? "Training"}</h1>
      <p className="mt-3 text-sm text-steel">
        Log sets, reps, and load. SYSTEM evaluates the file. This is not medical advice.
      </p>
      <label className="mt-6 block font-mono text-[10px] tracking-[0.2em] text-steel">
        MINUTES
        <input
          className={`${inputClass} mt-2`}
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </label>
      <div className="mt-6 space-y-5">
        {drafts.map((row, index) => {
          const meta = directive?.exercises[index];
          return (
            <div key={row.exerciseId}>
              <p className="text-sm text-paper">
                <span className="mr-2 font-mono text-[10px] tracking-[0.12em] text-amber">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {meta?.name ?? "Exercise"}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <input
                  aria-label="Sets"
                  className={inputClass}
                  value={row.sets}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDrafts((current) =>
                      current.map((item, i) => (i === index ? { ...item, sets: value } : item)),
                    );
                  }}
                />
                <input
                  aria-label="Reps"
                  className={inputClass}
                  value={row.reps}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDrafts((current) =>
                      current.map((item, i) => (i === index ? { ...item, reps: value } : item)),
                    );
                  }}
                />
                <input
                  aria-label="Load"
                  className={inputClass}
                  value={row.weight}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDrafts((current) =>
                      current.map((item, i) => (i === index ? { ...item, weight: value } : item)),
                    );
                  }}
                />
              </div>
              <p className="mt-1 font-mono text-[10px] text-steel">SETS · REPS · LOAD</p>
            </div>
          );
        })}
      </div>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <Cta disabled={busy || !directive} onClick={() => void complete()}>
        {busy ? "Evaluating…" : "Complete workout"}
      </Cta>
    </Shell>
  );
}
