"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cta, Field, Shell, inputClass } from "@/components/ui/Shell";
import { PLAYTEST_OPERATOR } from "@/lib/constants/playtest";

export function AuthForm({ mode }: { mode: "register" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState<string>(PLAYTEST_OPERATOR.email);
  const [password, setPassword] = useState<string>(PLAYTEST_OPERATOR.password);
  const [username, setUsername] = useState<string>(PLAYTEST_OPERATOR.username);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const path = mode === "register" ? "/api/v1/auth/register" : "/api/v1/auth/login";
      const payload =
        mode === "register"
          ? { email, password, username, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
          : { email, password };
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Could not continue.");
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <p className="font-mono text-[10px] tracking-[0.24em] text-amber">IDENTITY</p>
      <h1 className="mt-2 font-display text-4xl leading-none">
        {mode === "register" ? "Activate your file" : "Return to SYSTEM"}
      </h1>
      <p className="mt-3 text-sm text-steel">Your body is the save file.</p>

      <div className="mt-5 rounded-xl border border-steel-line bg-steel-raised p-4">
        <p className="font-mono text-[10px] tracking-[0.2em] text-amber">PLAYTEST FILE</p>
        <p className="mt-2 font-display text-2xl">{PLAYTEST_OPERATOR.username}</p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-steel">
          {PLAYTEST_OPERATOR.email}
          <br />
          {PLAYTEST_OPERATOR.password}
        </p>
        <p className="mt-3 text-xs text-steel">Remove before launch. No real email required.</p>
      </div>

      {mode === "register" ? (
        <Field label="CALLSIGN">
          <input
            autoComplete="username"
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
      ) : null}
      <Field label="EMAIL">
        <input
          autoComplete="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="PASSWORD">
        <input
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          className={inputClass}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <Cta disabled={busy} onClick={() => void submit()}>
        {busy ? "Working…" : mode === "register" ? "Activate" : "Enter"}
      </Cta>
      <p className="mt-6 text-center text-sm text-amber">
        {mode === "register" ? (
          <a href="/sign-in">Already activated? Sign in</a>
        ) : (
          <a href="/register">Need a file? Activate</a>
        )}
      </p>
    </Shell>
  );
}
