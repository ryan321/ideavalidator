"use client";

import { DropMenu } from "./DropMenu";
import { useT } from "./LocaleProvider";

// The header avatar (monogram circle) with the standard account dropdown:
// Account, Settings, Sign out. Server layout computes the initials; sign-out
// posts to the logout route then hard-navigates so every client state resets.

export function AvatarMenu({
  initials,
  name,
  email,
}: {
  initials: string;
  name: string | null;
  email: string;
}) {
  const t = useT();

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Full navigation (not router.push) — clears all in-memory client state.
      window.location.href = "/login";
    }
  }

  return (
    <DropMenu
      align="right"
      caret={false}
      label={`${t("nav.account")} · ${name?.trim() || email}`}
      triggerClassName="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-accent/15 font-display text-sm font-bold leading-none text-accent2 transition hover:border-accent/50 hover:bg-accent/25"
      trigger={<span aria-hidden>{initials}</span>}
      items={[
        { label: t("nav.account"), hint: name?.trim() || email, href: "/account" },
        { label: t("nav.settings"), href: "/account#settings" },
        { label: t("account.signOut"), danger: true, onClick: () => void signOut() },
      ]}
    />
  );
}
