import Link from "next/link";
import type { PromotionDto } from "@/lib/types";

export function PromotionCallout({ promotion }: { promotion: PromotionDto }) {
  if (!promotion.available || !promotion.to) return null;
  return (
    <Link
      href="/promote"
      className="mt-5 block rounded-xl border border-amber/40 bg-steel-raised p-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
    >
      <p className="font-mono text-[10px] tracking-[0.22em] text-amber">PROMOTION</p>
      <p className="mt-2 font-display text-2xl">{promotion.to} AVAILABLE</p>
      <p className="mt-1 text-sm text-steel">Rank is accepted. Level is earned.</p>
    </Link>
  );
}
