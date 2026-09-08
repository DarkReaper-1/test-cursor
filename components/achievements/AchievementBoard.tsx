import type { AchievementBoardDto, AchievementDto } from "@/lib/types";

function Row({ item }: { item: AchievementDto }) {
  const unlocked = item.status === "UNLOCKED";
  const locked = item.status === "LOCKED";
  return (
    <li className={`flex gap-3 ${locked ? "opacity-60" : ""}`}>
      <span className="w-6 font-mono text-[10px] tracking-[0.12em] text-amber">
        {unlocked ? "✓" : "○"}
      </span>
      <div className="min-w-0 flex-1">
        <p className={unlocked ? "text-paper" : "text-steel"}>{item.title}</p>
        <p className="mt-0.5 text-sm text-steel">
          {unlocked ? item.identity : item.description}
        </p>
        <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-amber">
          {item.progress} / {item.target}
          {unlocked ? " · UNLOCKED" : locked ? " · LOCKED" : null}
        </p>
      </div>
      <p className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-steel">+{item.xpReward}</p>
    </li>
  );
}

export function AchievementSection({
  heading,
  items,
}: {
  heading: string;
  items: AchievementDto[];
}) {
  return (
    <section className="rounded-xl border border-steel-line bg-steel-raised p-5">
      <p className="font-mono text-[10px] tracking-[0.2em] text-amber">{heading}</p>
      <ol className="mt-4 space-y-4">
        {items.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ol>
    </section>
  );
}

export function AchievementBoardView({ board }: { board: AchievementBoardDto }) {
  return (
    <div className="space-y-5">
      <AchievementSection heading="MILESTONES" items={board.milestones} />
      <AchievementSection heading="STREAK" items={board.streak} />
      <AchievementSection heading="MASTERY" items={board.mastery} />
    </div>
  );
}
