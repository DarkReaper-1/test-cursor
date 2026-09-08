import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccountId } from "@/server/auth/session";
import { getPromotionForAccount } from "@/server/services/rank-promotion";
import { Shell } from "@/components/ui/Shell";
import { PromoteClient } from "@/components/rank/PromoteClient";

export default async function PromotePage() {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/sign-in");
  const promotion = await getPromotionForAccount(accountId);

  return (
    <Shell>
      <Link href="/" className="text-sm text-amber">
        Today
      </Link>
      <div className="mt-6">
        <PromoteClient promotion={promotion} />
      </div>
    </Shell>
  );
}
