"use client";

export function SignOutButton() {
  return (
    <button
      className="text-amber"
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
