"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Cta, Shell } from "@/components/ui/Shell";
import { VISION_PRIVACY_LINE } from "@/lib/constants/vision";
import { emptyRepCounter, tickRepCounter, type RepCounterState } from "@/lib/vision/rep-counter";
import { cameraDurationSec, cameraWorkoutBody, summarizeCameraSets } from "@/lib/vision/workout-payload";
import { createPoseEngine, type PoseEngine } from "@/lib/vision/pose-engine";
import type { TrainingDirective } from "@/lib/types";

type CatalogExercise = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

type LoggedExercise = {
  exerciseId: string;
  slug: string;
  name: string;
  setReps: number[];
};

export function CameraTrainClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<PoseEngine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const counterRef = useRef<RepCounterState>(emptyRepCounter());
  const rafRef = useRef<number>(0);
  const [directive, setDirective] = useState<TrainingDirective | null>(null);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [selected, setSelected] = useState<CatalogExercise | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counter, setCounter] = useState<RepCounterState>(emptyRepCounter());
  const [setReps, setSetReps] = useState<number[]>([]);
  const [logged, setLogged] = useState<LoggedExercise[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/v1/today").then(async (response) => {
        if (!response.ok) throw new Error("Could not load today’s directive.");
        return response.json() as Promise<{ directive: TrainingDirective }>;
      }),
      fetch("/api/v1/exercises").then(async (response) => {
        if (!response.ok) throw new Error("Could not load the catalog.");
        return response.json() as Promise<{ exercises: CatalogExercise[] }>;
      }),
    ])
      .then(([today, catalogPayload]) => {
        setDirective(today.directive);
        setCatalog(catalogPayload.exercises);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Load failed."));
  }, []);

  const haltCamera = () => {
    cancelAnimationFrame(rafRef.current);
    engineRef.current?.close();
    engineRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const stopCamera = () => {
    haltCamera();
    setLive(false);
  };

  useEffect(() => () => haltCamera(), []);

  const attachStream = async (mode: "user" | "environment") => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: mode, width: { ideal: 720 }, height: { ideal: 1280 } },
    });
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) throw new Error("Camera view is missing.");
    video.srcObject = stream;
    await video.play();
  };

  const startCamera = async (exercise: CatalogExercise, mode = facing) => {
    setError(null);
    setSelected(exercise);
    setSetReps([]);
    counterRef.current = emptyRepCounter();
    setCounter(emptyRepCounter());
    setStartedAt((current) => current ?? Date.now());
    haltCamera();
    try {
      await attachStream(mode);
      const engine = await createPoseEngine();
      engineRef.current = engine;
      setLive(true);
      let lastUi = 0;
      const loop = () => {
        const node = videoRef.current;
        const pose = engineRef.current;
        if (node && pose && node.readyState >= 2) {
          const landmarks = pose.detect(node, performance.now());
          const slug = exercise.slug;
          const previous = counterRef.current.reps;
          const now = performance.now();
          counterRef.current = tickRepCounter(counterRef.current, slug, landmarks, now);
          if (counterRef.current.reps !== previous || now - lastUi > 90) {
            lastUi = now;
            setCounter({ ...counterRef.current });
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      stopCamera();
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setError(
        denied
          ? "Camera permission is off. SYSTEM cannot file work it has not seen."
          : "Could not start movement detection. SYSTEM only files work it has seen.",
      );
    }
  };

  const flipCamera = async () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    if (!live) return;
    try {
      await attachStream(next);
    } catch {
      setError("Could not flip the camera.");
    }
  };

  const completeSet = () => {
    const reps = counterRef.current.reps;
    if (reps < 1) {
      setError("SYSTEM has not seen a set yet.");
      return;
    }
    setError(null);
    setSetReps((current) => [...current, reps]);
    counterRef.current = emptyRepCounter();
    setCounter(emptyRepCounter());
  };

  const finishExercise = () => {
    if (!selected) return;
    const reps = [...setReps];
    if (counterRef.current.reps > 0) reps.push(counterRef.current.reps);
    if (reps.length === 0) {
      setError("Complete at least one set, or pick a different exercise.");
      return;
    }
    setLogged((current) => {
      const next = current.filter((item) => item.exerciseId !== selected.id);
      return [...next, { exerciseId: selected.id, slug: selected.slug, name: selected.name, setReps: reps }];
    });
    stopCamera();
    setSelected(null);
    setSetReps([]);
  };

  const submit = async () => {
    const rows = [...logged];
    if (selected) {
      const reps = [...setReps];
      if (counterRef.current.reps > 0) reps.push(counterRef.current.reps);
      if (reps.length > 0) {
        rows.push({ exerciseId: selected.id, slug: selected.slug, name: selected.name, setReps: reps });
      }
    }
    if (rows.length === 0) {
      setError("Log at least one set SYSTEM has seen before it evaluates.");
      return;
    }
    setBusy(true);
    setError(null);
    stopCamera();
    try {
      const body = cameraWorkoutBody({
        idempotencyKey: crypto.randomUUID(),
        durationSec: cameraDurationSec(startedAt ?? Date.now() - 60_000, Date.now()),
        exercises: rows.map((row) => ({
          exerciseId: row.exerciseId,
          ...summarizeCameraSets(row.setReps),
        })),
      });
      const response = await fetch("/api/v1/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not complete.");
      router.push("/result");
      router.refresh();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not complete.");
    }
  };

  const cameraCatalog = catalog;
  const todayIds = new Set(directive?.exercises.map((item) => item.exerciseId) ?? []);

  return (
    <Shell>
      <a href="/" className="text-sm text-amber">
        Today
      </a>
      <h1 className="mt-3 font-display text-4xl leading-none">Train</h1>
      <p className="mt-3 text-sm text-steel">{VISION_PRIVACY_LINE}</p>

      <div className="relative mt-5 overflow-hidden rounded-xl border border-steel-line bg-void">
        <video
          ref={videoRef}
          className={`aspect-[3/4] w-full bg-black object-cover ${facing === "user" ? "scale-x-[-1]" : ""} ${live ? "" : "hidden"}`}
          playsInline
          muted
          autoPlay
        />
        {!live ? (
          <div className="flex aspect-[3/4] items-center justify-center px-6 text-center">
            <p className="text-sm text-steel">Select an exercise. SYSTEM must see the movement to file it.</p>
          </div>
        ) : null}
        {live ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-void to-transparent p-4">
            <p className="font-mono text-[10px] tracking-[0.2em] text-amber">
              {selected?.name.toUpperCase()} ·{" "}
              {counter.inFrame ? (selected?.slug === "plank" ? "HOLD" : counter.phase.toUpperCase()) : "FIND BODY"}
            </p>
            <p className="mt-1 font-display text-5xl tabular-nums leading-none">
              {selected?.slug === "plank" ? `${counter.reps}s` : counter.reps}
            </p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.16em] text-steel">
              SET {String(setReps.length + 1).padStart(2, "0")}
              {setReps.length > 0 ? ` · ${setReps.join(" / ")}` : ""}
            </p>
          </div>
        ) : null}
      </div>

      {live ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="min-h-12 rounded-md border border-steel-line text-sm text-paper"
            type="button"
            onClick={completeSet}
          >
            Complete set
          </button>
          <button
            className="min-h-12 rounded-md border border-steel-line text-sm text-paper"
            type="button"
            onClick={() => void flipCamera()}
          >
            Flip camera
          </button>
        </div>
      ) : null}

      {live ? (
        <button className="mt-2 min-h-12 w-full text-sm text-amber" type="button" onClick={finishExercise}>
          Finish this exercise
        </button>
      ) : (
        <div className="mt-6 space-y-2">
          <p className="font-mono text-[10px] tracking-[0.2em] text-steel">SELECT EXERCISE</p>
          {cameraCatalog.map((item) => (
            <button
              key={item.id}
              className="flex min-h-14 w-full items-center justify-between rounded-xl border border-steel-line bg-steel-raised px-4 text-left"
              type="button"
              onClick={() => void startCamera(item)}
            >
              <span>
                <span className="block text-sm text-paper">{item.name}</span>
                <span className="mt-1 block font-mono text-[10px] tracking-[0.14em] text-steel">
                  {todayIds.has(item.id) ? "TODAY’S DIRECTIVE" : item.slug.replaceAll("_", " ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {logged.length > 0 ? (
        <div className="mt-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-steel">FILED</p>
          {logged.map((row) => {
            const summary = summarizeCameraSets(row.setReps);
            return (
              <p key={row.exerciseId} className="mt-2 text-sm text-paper">
                {row.name} · {summary.sets} × {summary.reps}
              </p>
            );
          })}
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-amber">{error}</p> : null}

      <Cta disabled={busy || (logged.length === 0 && setReps.length === 0 && counter.reps === 0)} onClick={() => void submit()}>
        {busy ? "Evaluating…" : "Complete workout"}
      </Cta>
    </Shell>
  );
}
