import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccountId } from "@/server/auth/session";
import { getAchievementBoard } from "@/server/services/achievement";
import { Shell } from "@/components/ui/Shell";
import { AchievementBoardView } from "@/components/achievements/AchievementBoard";

export default async function AchievementsPage() {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/sign-in");
  const board = await getAchievementBoard(accountId);

  return (
    <Shell>
      <p className="font-mono text-[10px] tracking-[0.24em] text-amber">IDENTITY</p>
      <h1 className="mt-3 font-display text-4xl leading-none">Achievements</h1>
      <p className="mt-3 text-sm text-steel">What you have become. These do not expire.</p>

      <div className="mt-7">
        <AchievementBoardView board={board} />
      </div>

      <nav className="mt-8 flex gap-6 text-sm text-amber">
        <Link href="/">Today</Link>
        <Link href="/quests">Quests</Link>
        <Link href="/player">Player</Link>
      </nav>
    </Shell>
  );
}
