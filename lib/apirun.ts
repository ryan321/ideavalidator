import { NextResponse } from "next/server";
import {
  currentVersion,
  getArtifact,
  getEvidence,
  getVersion,
  refundApiCredit,
  spendApiCredit,
  type ApiKey,
  type Idea,
} from "./db";
import { apiError } from "./apiauth";
import { toApiValidation } from "./apiformat";
import { runGenerator } from "./generators";
import type { Validation } from "./generators/validation";

// Shared machinery for the public API's generative endpoints. Metering is uniform: one
// credit per generative call (a read is free). Credits are independent of the human
// Stripe campaign-pass — the API surface is gated only by the key's balance.

/** Spend one credit up front; returns a 402 response if the key is empty, else null. */
export function charge(key: ApiKey): NextResponse | null {
  if (!spendApiCredit(key.id)) {
    return apiError("insufficient_credits", "This API key is out of credits — mint or top up to continue.", 402, {
      credits: 0,
    });
  }
  return null;
}

/** Run a generative op, refunding the already-charged credit if it throws. */
export async function withRefundOnError<T>(key: ApiKey, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    refundApiCredit(key.id);
    throw e;
  }
}

/** Validate an idea's current version and return the projected report (caller charges). */
export async function validateCurrentVersion(key: ApiKey, idea: Idea, deep: boolean): Promise<NextResponse> {
  const version = currentVersion(idea.id);
  if (!version) return apiError("not_found", "This idea has no version to validate.", 404);
  try {
    await withRefundOnError(key, () => runGenerator(version.id, "validation", { deep }));
  } catch (e) {
    return apiError("validation_failed", e instanceof Error ? e.message : "Validation failed", 502);
  }
  const fresh = getVersion(version.id)!;
  const art = getArtifact(version.id, "validation");
  if (!art) return apiError("validation_failed", "Validation produced no artifact.", 502);
  const evidence = getEvidence(version.id);
  return NextResponse.json(toApiValidation(idea, fresh, art.data as Validation, evidence));
}
