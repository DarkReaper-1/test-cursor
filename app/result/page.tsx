import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccountId } from "@/server/auth/session";
import { getLatestEvaluation } from "@/server/services/progression";
import { Shell } from "@/components/ui/Shell";
import { EvaluationView } from "@/components/result/EvaluationView";

export default async function ResultPage() {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/sign-in");
  const result = await getLatestEvaluation(accountId);

  if (!result) {
    return (
      <Shell>
        <p className="font-mono text-[10px] tracking-[0.24em] text-amber">EVALUATION</p>
        <h1 className="mt-3 font-display text-3xl">No evaluation on file</h1>
        <p className="mt-3 text-sm text-steel">Complete today’s training to write a result.</p>
        <Link
          href="/"
          className="mt-8 flex min-h-14 items-center justify-center rounded-md bg-paper text-sm font-semibold text-void outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
          Continue
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <EvaluationView result={result} />
    </Shell>
  );
}
