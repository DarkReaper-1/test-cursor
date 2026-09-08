import Link from "next/link";

export function Shell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-8">
      <header className="mb-8 flex items-baseline justify-between">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-amber">
          SYSTEM
        </Link>
        <p className="font-mono text-[10px] tracking-[0.18em] text-steel">V0.1</p>
      </header>
      <main className="flex-1">{children}</main>
      {footer}
    </div>
  );
}

export function Cta({
  children,
  disabled,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      className="mt-6 min-h-12 w-full rounded-md bg-paper text-sm font-semibold text-void disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block">
      <span className="font-mono text-[10px] tracking-[0.2em] text-steel">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export const inputClass =
  "min-h-12 w-full rounded-md border border-steel-line bg-steel-raised px-3 text-paper outline-none focus:border-amber";
