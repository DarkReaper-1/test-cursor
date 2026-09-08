export function XpTrack({
  into,
  toNext,
  label,
}: {
  into: number;
  toNext: number;
  label?: string;
}) {
  const ratio = toNext <= 0 ? 0 : into / toNext;
  const fill = Math.min(100, Math.max(6, Math.round(ratio * 100)));
  return (
    <div>
      {label ? (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="font-mono text-[10px] tracking-[0.2em] text-steel">{label}</p>
          <p className="font-mono text-xs text-paper">
            {into} / {toNext}
          </p>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-void"
        role="meter"
        aria-label={label ?? "Experience"}
        aria-valuemin={0}
        aria-valuemax={toNext}
        aria-valuenow={into}
      >
        <div className="h-full rounded-full bg-amber" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}
