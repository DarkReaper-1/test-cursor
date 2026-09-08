import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccountId } from "@/server/auth/session";
import { getToday } from "@/server/services/today";
import { Shell } from "@/components/ui/Shell";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function TodayPage() {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/sign-in");
  const { player, directive } = await getToday(accountId);
  const fill = Math.max(4, Math.round((player.xpIntoLevel / player.xpToNext) * 100));

  return (
    <Shell
      footer={
        <div className="mt-8 flex gap-6 text-sm text-amber">
          <Link href="/player">Player</Link>
          <SignOutButton />
        </div>
      }
    >
      <p className="font-mono text-[10px] tracking-[0.24em] text-amber">SYSTEM</p>
      <h1 className="mt-2 font-display text-4xl leading-none">What should you do now?</h1>

      <section className="mt-8 rounded-xl border border-steel-line bg-steel-raised p-4">
        <p className="font-mono text-[10px] tracking-[0.2em] text-steel">LEVEL {player.level}</p>
        <p className="mt-2 text-sm text-paper">
          {player.rank} · {player.xpIntoLevel} / {player.xpToNext} XP · STREAK {player.streak}
        </p>
        <p className="mt-1 font-mono text-xs text-steel">{player.username}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-void">
          <div className="h-full bg-amber" style={{ width: `${fill}%` }} />
        </div>
      </section>

      <section className="mt-5 rounded-xl bg-[#1a1714] p-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-amber">TODAY’S DIRECTIVE</p>
        <h2 className="mt-2 font-display text-2xl">{directive.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-steel">{directive.body}</p>
        <ul className="mt-4 space-y-1 text-sm text-paper">
          {directive.exercises.map((item) => (
            <li key={item.exerciseId}>
              {item.name} · {item.targetSets} × {item.targetReps}
            </li>
          ))}
        </ul>
        <Link
          href="/train"
          className="mt-6 flex min-h-12 items-center justify-center rounded-md bg-paper text-sm font-semibold text-void"
        >
          Begin training
        </Link>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-2">
        {(
          [
            ["STR", player.strength],
            ["END", player.endurance],
            ["AGI", player.agility],
            ["VIT", player.vitality],
            ["DIS", player.discipline],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="rounded-lg border border-steel-line bg-steel-raised p-3">
            <p className="font-mono text-[10px] tracking-[0.16em] text-steel">{key}</p>
            <p className="mt-1 font-display text-2xl">{value}</p>
          </div>
        ))}
      </section>
    </Shell>
  );
}
