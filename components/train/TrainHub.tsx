"use client";

import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { VISION_PRIVACY_LINE } from "@/lib/constants/vision";

export function TrainHub() {
  return (
    <Shell>
      <a href="/" className="text-sm text-amber">
        Today
      </a>
      <h1 className="mt-3 font-display text-4xl leading-none">Train</h1>
      <p className="mt-3 text-sm text-steel">Your body is the save file. SYSTEM evaluates the file. This is not medical advice.</p>

      <Link
        href="/train/camera"
        className="mt-8 block rounded-xl border border-steel-line bg-steel-raised p-5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
      >
        <p className="font-mono text-[10px] tracking-[0.2em] text-amber">CAMERA TRAINING</p>
        <p className="mt-2 font-display text-2xl">Let SYSTEM count</p>
        <p className="mt-2 text-sm text-steel">Select the exercise. The camera counts reps on this device.</p>
      </Link>

      <Link
        href="/train/manual"
        className="mt-4 block rounded-xl border border-steel-line bg-steel-raised p-5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
      >
        <p className="font-mono text-[10px] tracking-[0.2em] text-amber">MANUAL LOG</p>
        <p className="mt-2 font-display text-2xl">Enter your work</p>
        <p className="mt-2 text-sm text-steel">Crowded gym, machines, low battery, or you do not want the camera.</p>
      </Link>

      <p className="mt-8 text-xs leading-relaxed text-steel">{VISION_PRIVACY_LINE}</p>
    </Shell>
  );
}
