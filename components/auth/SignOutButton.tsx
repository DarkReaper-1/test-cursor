"use client";

export function SignOutButton() {
  return (
    <button
      className="min-h-11 text-amber outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
      type="button"
      onClick={() => {
        void fetch("/api/v1/auth/logout", { method: "POST" }).then(() => {
          window.location.href = "/sign-in";
        });
      }}
    >
      Sign out
    </button>
  );
}
