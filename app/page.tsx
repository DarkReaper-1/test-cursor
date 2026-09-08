import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccountId } from "@/server/auth/session";
import { getToday } from "@/server/services/today";
import { Shell } from "@/components/ui/Shell";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { XpTrack } from "@/components/ui/XpTrack";

export default async function TodayPage() {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/sign-in");
  const { player, directive } = await getToday(accountId);

  return (
    <Shell
      footer={
        <div className="sticky bottom-0 -mx-5 mt-8 border-t border-steel-line bg-void/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <Link
            href="/train"
            className="flex min-h-14 items-center justify-center rounded-md bg-paper text-sm font-semibold text-void outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            Begin training
          </Link>
        </div>
      }
    >
      <h1 className="mt-1 font-display text-4xl leading-none">What should you do now?</h1>
      <p className="mt-3 font-mono text-xs tracking-[0.14em] text-steel">{player.username}</p>

      <section className="mt-7 rounded-xl border border-steel-line bg-steel-raised p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-steel">RANK</p>
            <p className="mt-1 font-display text-2xl">{player.rank}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] tracking-[0.2em] text-steel">LEVEL</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{player.level}</p>
          </div>
        </div>
        <div className="mt-5">
          <XpTrack into={player.xpIntoLevel} toNext={player.xpToNext} label="XP" />
        </div>
        <p className="mt-4 font-mono text-[10px] tracking-[0.2em] text-amber">STREAK {player.streak}</p>
      </section>

      <section className="mt-5 rounded-xl bg-[#1a1714] p-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-amber">TODAY’S DIRECTIVE</p>
        <h2 className="mt-2 font-display text-2xl">{directive.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-steel">{directive.body}</p>
        <ol className="mt-5 space-y-3">
          {directive.exercises.map((item, index) => (
            <li key={item.exerciseId} className="flex gap-3 text-sm">
              <span className="w-6 font-mono text-[10px] tracking-[0.12em] text-amber">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="text-paper">{item.name}</span>
                <span className="mt-0.5 block text-steel">
                  {item.targetSets} × {item.targetReps}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-5">
        <p className="mb-3 font-mono text-[10px] tracking-[0.2em] text-steel">ATTRIBUTES</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["STRENGTH", player.strength],
              ["ENDURANCE", player.endurance],
              ["AGILITY", player.agility],
              ["VITALITY", player.vitality],
              ["DISCIPLINE", player.discipline],
            ] as const
          ).map(([key, value]) => (
            <div
              key={key}
              className={`rounded-lg border border-steel-line bg-steel-raised p-3 ${key === "DISCIPLINE" ? "col-span-2" : ""}`}
            >
              <p className="font-mono text-[10px] tracking-[0.16em] text-steel">{key}</p>
              <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <nav className="mt-6 flex gap-6 text-sm text-amber">
        <Link
          href="/player"
          className="min-h-11 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
          Player
        </Link>
        <SignOutButton />
      </nav>
    </Shell>
  );
}
