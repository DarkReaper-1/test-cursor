"use client";

import dynamic from "next/dynamic";
import { Shell } from "@/components/ui/Shell";

const CameraTrainClient = dynamic(
  () => import("@/components/train/CameraTrainClient").then((mod) => mod.CameraTrainClient),
  {
    ssr: false,
    loading: () => (
      <Shell>
        <p className="font-mono text-[10px] tracking-[0.2em] text-amber">TRAIN</p>
        <h1 className="mt-2 font-display text-4xl">Loading sensor</h1>
        <p className="mt-3 text-sm text-steel">
          Footage stays on this device. SYSTEM keeps sets and reps. The video is discarded. Work is not filed until
          SYSTEM has seen it.
        </p>
      </Shell>
    ),
  },
);

export default function TrainPage() {
  return <CameraTrainClient />;
}
