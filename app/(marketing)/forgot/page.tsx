import { redirect } from "next/navigation";
import { ForgotForm } from "@/components/PasswordResetForms";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ForgotPage() {
  if (await getSessionUser()) redirect("/studio");
  return <ForgotForm />;
}
