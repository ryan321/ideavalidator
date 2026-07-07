import { authenticate, requireOwnedIdea } from "@/lib/apiauth";
import { charge, validateCurrentVersion } from "@/lib/apirun";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/v1/ideas/{id}/validate — (re)validate the idea's current version.
// Body: { deep?: boolean }. Costs one credit.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const owned = requireOwnedIdea(auth.key, id);
  if ("response" in owned) return owned.response;

  let deep = false;
  try {
    deep = (await req.json())?.deep === true;
  } catch {
    /* empty body is fine */
  }
  const charged = charge(auth.key);
  if (charged) return charged;
  return validateCurrentVersion(auth.key, owned.idea, deep);
}
