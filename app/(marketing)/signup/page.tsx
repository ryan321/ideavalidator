import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSessionUser } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/studio");
  return <AuthForm mode="signup" googleEnabled={googleConfigured()} />;
}
