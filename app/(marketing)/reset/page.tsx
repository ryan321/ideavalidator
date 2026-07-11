import { ResetForm } from "@/components/PasswordResetForms";

export const dynamic = "force-dynamic";

// No signed-in redirect: someone signed in on another account can still complete a reset.
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetForm token={token ?? null} />;
}
