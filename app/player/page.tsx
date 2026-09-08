import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccountId } from "@/server/auth/session";
import { getMe } from "@/server/services/identity";
import { getPromotionForAccount } from "@/server/services/rank-promotion";
import { Shell } from "@/components/ui/Shell";
import { PromotionCallout } from "@/components/rank/PromotionCallout";

export default async function PlayerPage() {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/sign-in");
  const player = await getMe(accountId);
  const promotion = await getPromotionForAccount(accountId);

  return (
    <Shell>
      <Link href="/" className="text-sm text-amber">
        Today
      </Link>
      <h1 className="mt-3 font-display text-4xl">{player.username}</h1>
      <p className="mt-2 text-sm text-steel">
        Rank {player.rank} · Level {player.level} · Streak {player.streak}
      </p>
      <PromotionCallout promotion={promotion} />
      <div className="mt-8 grid grid-cols-2 gap-3">
        {(
          [
            ["STRENGTH", player.strength],
            ["ENDURANCE", player.endurance],
            ["AGILITY", player.agility],
            ["VITALITY", player.vitality],
            ["DISCIPLINE", player.discipline],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="rounded-lg border border-steel-line bg-steel-raised p-4">
            <p className="font-mono text-[10px] tracking-[0.16em] text-steel">{key}</p>
            <p className="mt-2 font-display text-3xl">{value}</p>
          </div>
        ))}
      </div>
      <nav className="mt-8 flex gap-6 text-sm text-amber">
        <Link href="/quests">Quests</Link>
        <Link href="/achievements">Achievements</Link>
      </nav>
    </Shell>
  );
}
