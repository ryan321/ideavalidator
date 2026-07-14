"use client";

/* eslint-disable @next/next/no-img-element -- tiny fixed-size external avatar; next/image
   would need remotePatterns config for googleusercontent and buys nothing at 36px */
import { useState } from "react";
import { DropMenu } from "./DropMenu";
import { useT } from "./LocaleProvider";

// The header avatar with the standard account dropdown: Account, Settings, Sign out.
// Shows the profile photo when one is set (captured from Google sign-in), falling back
// to the monogram — including when the image URL fails to load. Sign-out posts to the
// logout route then hard-navigates so every client state resets.

export function AvatarMenu({
  initials,
  name,
  email,
  avatarUrl,
}: {
  initials: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
}) {
  const t = useT();
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!avatarUrl && !imgFailed;

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
      triggerClassName={`ml-1 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border font-display text-sm font-bold leading-none text-accent2 transition hover:border-accent/50 ${
        showImg ? "bg-panel" : "bg-accent/15 hover:bg-accent/25"
      }`}
      trigger={
        showImg ? (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden>{initials}</span>
        )
      }
      items={[
        { label: t("nav.account"), hint: name?.trim() || email, href: "/account" },
        { label: t("nav.settings"), href: "/account#settings" },
        { label: t("account.signOut"), danger: true, onClick: () => void signOut() },
      ]}
    />
  );
}
