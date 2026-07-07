import { redirect } from "next/navigation";
import { AccountClient } from "@/components/AccountClient";
import { listApiKeysForUser } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TRIAL_CREDITS = Number(process.env.API_TRIAL_CREDITS ?? 5);

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const keys = listApiKeysForUser(user.id).map((k) => ({
    id: k.id,
    prefix: k.prefix,
    label: k.label,
    credits: k.credits,
    revoked: !!k.revoked,
    last_used_at: k.last_used_at,
  }));
  return (
    <AccountClient email={user.email} name={user.name} initialKeys={keys} trialCredits={TRIAL_CREDITS} />
  );
}
