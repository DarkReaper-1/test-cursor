import type { QuestBoardDto, QuestDto } from "@/lib/types";

function padIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function QuestRow({ quest, index }: { quest: QuestDto; index: number }) {
  const done = quest.status === "COMPLETED";
  const expired = quest.status === "EXPIRED";
  return (
    <li className="flex gap-3">
      <span className="w-6 font-mono text-[10px] tracking-[0.12em] text-amber">
        {done ? "✓" : padIndex(index)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={done ? "text-paper" : expired ? "text-steel" : "text-paper"}>{quest.title}</p>
        <p className="mt-0.5 text-sm text-steel">{quest.description}</p>
        <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-amber">
          {quest.progress} / {quest.target}
          {expired ? " · EXPIRED" : null}
        </p>
      </div>
      <p className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-steel">+{quest.xpReward}</p>
    </li>
  );
}

export function QuestList({
  board,
  heading,
}: {
  board: QuestBoardDto;
  heading: string;
}) {
  return (
    <section className="rounded-xl border border-steel-line bg-steel-raised p-5">
      <p className="font-mono text-[10px] tracking-[0.2em] text-amber">{heading}</p>
      <ol className="mt-4 space-y-4">
        {board.quests.map((quest, index) => (
          <QuestRow key={quest.id} quest={quest} index={index} />
        ))}
      </ol>
      <p className="mt-5 font-mono text-[10px] tracking-[0.2em] text-steel">
        {board.completedCount} / {board.totalCount} COMPLETE
      </p>
    </section>
  );
}
