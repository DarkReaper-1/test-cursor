import Link from "next/link";
import { ATTRIBUTE_KEYS } from "@/lib/constants/attributes";
import { pad2 } from "@/lib/format";
import type { WorkoutResult } from "@/lib/types";
import { XpTrack } from "@/components/ui/XpTrack";
import { PromotionCallout } from "@/components/rank/PromotionCallout";

const ATTR_LABEL: Record<(typeof ATTRIBUTE_KEYS)[number], string> = {
  strength: "STRENGTH",
  endurance: "ENDURANCE",
  agility: "AGILITY",
  vitality: "VITALITY",
  discipline: "DISCIPLINE",
};

function Rule() {
  return <div className="my-6 h-px bg-steel-line" role="separator" />;
}

function Shift({
  label,
  from,
  to,
  prominent = false,
}: {
  label: string;
  from: string;
  to: string;
  prominent?: boolean;
}) {
  const changed = from !== to;
  return (
    <div className={prominent ? "py-1" : ""}>
      <p className="font-mono text-[10px] tracking-[0.22em] text-amber">{label}</p>
      <p
        className={
          prominent
            ? "mt-2 font-display text-4xl tabular-nums tracking-tight"
            : "mt-1 font-display text-2xl tabular-nums"
        }
      >
        {from}
        <span className="mx-3 text-steel" aria-hidden>
          →
        </span>
        <span className={changed ? "text-paper" : "text-steel"}>{to}</span>
      </p>
    </div>
  );
}

export function EvaluationView({ result }: { result: WorkoutResult }) {
  const { before, player } = result;
  const attrRows = ATTRIBUTE_KEYS.filter((key) => before[key] !== player[key]).map((key) => ({
    key,
    label: ATTR_LABEL[key],
    from: pad2(before[key]),
    to: pad2(player[key]),
  }));

  return (
    <article>
      <p className="font-mono text-[10px] tracking-[0.28em] text-amber">EVALUATION</p>
      <h1 className="mt-3 font-display text-4xl leading-none">Training complete</h1>
      <p className="mt-5 font-display text-5xl tabular-nums tracking-tight text-paper">+{result.xp} XP</p>
      <p className="mt-2 font-mono text-[10px] tracking-[0.18em] text-steel">SERVER AWARDED</p>

      {result.questCompletions.length > 0 ? (
        <>
          <Rule />
          <div className="space-y-6">
            {result.questCompletions.map((quest) => (
              <div key={quest.id}>
                <p className="font-mono text-[10px] tracking-[0.22em] text-amber">QUEST COMPLETE</p>
                <p className="mt-2 font-display text-3xl">{quest.title}</p>
                <p className="mt-2 font-display text-2xl tabular-nums">+{quest.xp} XP</p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {result.achievementUnlocks.length > 0 ? (
        <>
          <Rule />
          <div className="space-y-6">
            {result.achievementUnlocks.map((item) => (
              <div key={item.id}>
                <p className="font-mono text-[10px] tracking-[0.22em] text-amber">ACHIEVEMENT UNLOCKED</p>
                <p className="mt-2 font-display text-3xl">{item.title}</p>
                <p className="mt-1 text-sm text-steel">{item.identity}</p>
                <p className="mt-2 font-display text-2xl tabular-nums">+{item.xp} XP</p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <Rule />

      {result.leveledUp ? (
        <Shift label="LEVEL UP" from={pad2(before.level)} to={pad2(player.level)} prominent />
      ) : (
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-amber">LEVEL {pad2(player.level)}</p>
          <p className="mt-2 text-sm text-steel">Progress toward {pad2(player.level + 1)}</p>
          <div className="mt-3">
            <XpTrack into={player.xpIntoLevel} toNext={player.xpToNext} label="XP IN LEVEL" />
          </div>
        </div>
      )}

      {attrRows.length > 0 ? (
        <>
          <Rule />
          <div className="space-y-5">
            {attrRows.map((row) => (
              <Shift key={row.key} label={row.label} from={row.from} to={row.to} />
            ))}
          </div>
        </>
      ) : null}

      <Rule />

      <Shift label="STREAK" from={pad2(before.streak)} to={pad2(player.streak)} />

      <Rule />

      <div>
        <p className="font-mono text-[10px] tracking-[0.22em] text-amber">RANK</p>
        <p className="mt-2 font-display text-2xl">{player.rank}</p>
        <p className="mt-1 text-sm text-steel">Accepted status. Level is earned through XP.</p>
      </div>

      {result.promotion.available ? (
        <>
          <Rule />
          <PromotionCallout promotion={result.promotion} />
        </>
      ) : result.promotion.to ? (
        <>
          <Rule />
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-amber">NEXT RANK</p>
            <p className="mt-2 font-display text-2xl">{result.promotion.to}</p>
            <p className="mt-1 text-sm text-steel">Requirements are not yet met.</p>
          </div>
        </>
      ) : null}

      <Rule />

      <p className="font-mono text-[10px] tracking-[0.24em] text-steel">PROGRESS SAVED</p>

      <Link
        href="/"
        className="mt-8 flex min-h-14 items-center justify-center rounded-md bg-paper text-sm font-semibold text-void outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
      >
        Continue
      </Link>
    </article>
  );
}
