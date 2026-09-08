import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccountId } from "@/server/auth/session";
import { getQuestPage } from "@/server/services/quest";
import { Shell } from "@/components/ui/Shell";
import { QuestList } from "@/components/quests/QuestList";

export default async function QuestsPage() {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/sign-in");
  const { daily, weekly } = await getQuestPage(accountId);

  return (
    <Shell>
      <p className="font-mono text-[10px] tracking-[0.24em] text-amber">OBJECTIVES</p>
      <h1 className="mt-3 font-display text-4xl leading-none">Quests</h1>
      <p className="mt-3 text-sm text-steel">Training writes progress. Quests observe it.</p>

      <div className="mt-7">
        <QuestList board={daily} heading="DAILY" />
      </div>
      <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-steel">
        Ends at local midnight
      </p>

      <div className="mt-5">
        <QuestList board={weekly} heading="WEEKLY" />
      </div>
      <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-steel">
        Ends at the close of the local week
      </p>

      <nav className="mt-8 flex gap-6 text-sm text-amber">
        <Link href="/">Today</Link>
        <Link href="/player">Player</Link>
        <Link href="/achievements">Achievements</Link>
      </nav>
    </Shell>
  );
}
