import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/v1/openapi.json — the machine-readable contract. Agent frameworks that ingest
// OpenAPI can turn every endpoint below into a callable tool. No auth (it's the map).
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return NextResponse.json(spec(origin));
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (schema: object, required = true) => ({
  required,
  content: { "application/json": { schema } },
});
const ok = (schema: object, description = "Success") => ({
  description,
  content: { "application/json": { schema } },
});
const errResp = (description: string) => ({
  description,
  content: { "application/json": { schema: ref("Error") } },
});
const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "Idea id.",
};
const secured = [{ bearerAuth: [] }];

function spec(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "IdeaValidator API",
      version: "1.0.0",
      description:
        "Grounded startup-idea validation for agents. POST an idea, get an evidence-backed verdict, a pre-registered kill-test, a moat read, and the real posts behind the demand signal. Then iterate: refine, explore divergent wedges, generate the test kit, and record the real-world result to re-judge.\n\nAuth: `Authorization: Bearer iv_live_…`. Each generative call costs one credit; reads are free. Keys own the ideas they create and cannot see other keys' data.",
    },
    servers: [{ url: `${origin}/api` }],
    security: secured,
    paths: {
      "/v1/validate": {
        post: {
          operationId: "validateIdea",
          summary: "One-shot: create an idea and validate it",
          description: "Creates the idea (owned by your key), collects real evidence, scores it, and returns the report. Costs one credit.",
          security: secured,
          requestBody: jsonBody(ref("ValidateRequest")),
          responses: {
            "200": ok(ref("Validation")),
            "400": errResp("Invalid request"),
            "401": errResp("Missing/invalid key"),
            "402": errResp("Out of credits"),
            "502": errResp("Validation failed"),
          },
        },
      },
      "/v1/ideas": {
        get: {
          operationId: "listIdeas",
          summary: "List the ideas your key owns",
          security: secured,
          responses: { "200": ok(ref("IdeaList")), "401": errResp("Unauthorized") },
        },
        post: {
          operationId: "createIdea",
          summary: "Create an idea without validating (free)",
          security: secured,
          requestBody: jsonBody(ref("CreateIdeaRequest")),
          responses: { "201": ok(ref("IdeaRef")), "400": errResp("Invalid"), "401": errResp("Unauthorized") },
        },
      },
      "/v1/ideas/{id}": {
        get: {
          operationId: "getIdea",
          summary: "Get an idea, its versions, and the latest validation",
          security: secured,
          parameters: [idParam],
          responses: { "200": ok(ref("IdeaDetail")), "401": errResp("Unauthorized"), "404": errResp("Not found") },
        },
        delete: {
          operationId: "deleteIdea",
          summary: "Delete an owned idea and all its data",
          security: secured,
          parameters: [idParam],
          responses: { "200": ok({ type: "object", properties: { deleted: { type: "boolean" } } }), "404": errResp("Not found") },
        },
      },
      "/v1/ideas/{id}/validate": {
        post: {
          operationId: "revalidateIdea",
          summary: "(Re)validate the idea's current version",
          description: "Costs one credit.",
          security: secured,
          parameters: [idParam],
          requestBody: jsonBody({ type: "object", properties: { deep: { type: "boolean", description: "Run the deeper bull/bear/CoVe pass (~3-4x cost)." } } }, false),
          responses: { "200": ok(ref("Validation")), "402": errResp("Out of credits"), "404": errResp("Not found"), "502": errResp("Failed") },
        },
      },
      "/v1/ideas/{id}/versions": {
        post: {
          operationId: "createVersion",
          summary: "Create a new version from a rewritten statement (free)",
          description: "Pins the current version's evidence so a follow-up validate compares on constant evidence. Validate it next.",
          security: secured,
          parameters: [idParam],
          requestBody: jsonBody(ref("CreateVersionRequest")),
          responses: { "201": ok(ref("VersionRef")), "400": errResp("Invalid"), "404": errResp("Not found") },
        },
      },
      "/v1/ideas/{id}/refine": {
        post: {
          operationId: "refineIdea",
          summary: "Propose a sharper statement targeting weak criteria",
          description: "Returns a proposal; create it with POST /versions then validate. Costs one credit.",
          security: secured,
          parameters: [idParam],
          responses: { "200": ok(ref("Refinement")), "402": errResp("Out of credits"), "404": errResp("Not found") },
        },
      },
      "/v1/ideas/{id}/wedges": {
        post: {
          operationId: "proposeWedges",
          summary: "Propose 3-5 divergent strategic variants",
          description: "Create the ones you want with POST /versions and validate each on the shared pinned corpus. Costs one credit.",
          security: secured,
          parameters: [idParam],
          responses: { "200": ok(ref("WedgeSet")), "402": errResp("Out of credits"), "404": errResp("Not found") },
        },
      },
      "/v1/ideas/{id}/kit": {
        post: {
          operationId: "generateKit",
          summary: "Kill-test execution kit (script, signals, outreach)",
          description: "Requires a prior validation on the current version. Costs one credit.",
          security: secured,
          parameters: [idParam],
          responses: { "200": ok(ref("Kit")), "402": errResp("Out of credits"), "404": errResp("Not found"), "502": errResp("Failed") },
        },
      },
      "/v1/ideas/{id}/intel": {
        post: {
          operationId: "generateIntel",
          summary: "Cited competitor pricing/funding + one-liner",
          description: "Requires a prior validation with named competitors and EXA_API_KEY on the server. Costs one credit.",
          security: secured,
          parameters: [idParam],
          responses: { "200": ok(ref("Intel")), "402": errResp("Out of credits"), "404": errResp("Not found"), "502": errResp("Failed") },
        },
      },
      "/v1/ideas/{id}/test-result": {
        post: {
          operationId: "recordTestResult",
          summary: "Record the kill-test's real-world result",
          description: "The system judges your report against the PRE-REGISTERED pass/kill bars, not your call. Costs one credit.",
          security: secured,
          parameters: [idParam],
          requestBody: jsonBody(ref("TestResultRequest")),
          responses: { "200": ok(ref("TestResult")), "400": errResp("Invalid"), "402": errResp("Out of credits"), "404": errResp("Not found") },
        },
      },
      "/v1/account": {
        get: {
          operationId: "getAccount",
          summary: "Your key's credit balance and identity",
          security: secured,
          responses: { "200": ok(ref("Account")), "401": errResp("Unauthorized") },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "An `iv_live_…` API key." },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: { type: { type: "string" }, message: { type: "string" } },
            },
          },
        },
        ValidateRequest: {
          type: "object",
          required: ["idea"],
          properties: {
            idea: { type: "string", description: "The idea, 1-3 sentences." },
            goal: { type: "string", enum: ["lifestyle", "side_hustle", "venture", "unsure"], description: "Selects the verdict bands." },
            founder_fit: { type: "string", description: "The founder's relevant skills/network/assets (raises or caps criteria that rest on them)." },
            provenance: { type: "string", enum: ["organic", "whiteboard"], description: "organic = lived the pain; whiteboard = brainstormed." },
            deep: { type: "boolean" },
          },
        },
        CreateIdeaRequest: {
          type: "object",
          required: ["idea"],
          properties: {
            idea: { type: "string" },
            goal: { type: "string", enum: ["lifestyle", "side_hustle", "venture", "unsure"] },
            founder_fit: { type: "string" },
            provenance: { type: "string", enum: ["organic", "whiteboard"] },
          },
        },
        CreateVersionRequest: {
          type: "object",
          required: ["statement"],
          properties: {
            statement: { type: "string", description: "The rewritten idea statement." },
            label: { type: "string" },
            rationale: { type: "string" },
          },
        },
        TestResultRequest: {
          type: "object",
          required: ["report"],
          properties: { report: { type: "string", description: "What happened when you ran the test — numbers first." } },
        },
        IdeaRef: {
          type: "object",
          properties: { id: { type: "string" }, title: { type: "string" }, goal: { type: "string" }, version_id: { type: "string" }, version: { type: "integer" } },
        },
        VersionRef: {
          type: "object",
          properties: { version_id: { type: "string" }, version: { type: "integer" }, label: { type: "string" } },
        },
        IdeaList: {
          type: "object",
          properties: {
            ideas: {
              type: "array",
              items: {
                type: "object",
                properties: { id: { type: "string" }, title: { type: "string" }, goal: { type: "string" }, best_score: { type: "integer" }, version_count: { type: "integer" }, created_at: { type: "string" } },
              },
            },
          },
        },
        IdeaDetail: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            goal: { type: "string" },
            versions: { type: "array", items: { type: "object", properties: { id: { type: "string" }, version: { type: "integer" }, label: { type: "string" }, score: { type: "integer" }, archived: { type: "boolean" } } } },
            current_version_id: { type: "string" },
            validation: { anyOf: [ref("Validation"), { type: "null" }] },
          },
        },
        Validation: {
          type: "object",
          description: "The grounded validation report.",
          properties: {
            idea_id: { type: "string" },
            version_id: { type: "string" },
            version: { type: "integer" },
            goal: { type: "string" },
            verdict: { type: "string", enum: ["GO", "MAYBE", "NO-GO", "INSUFFICIENT EVIDENCE"] },
            score: { type: "integer", description: "0-100, judged against the goal's bands." },
            score_sd: { type: "integer", description: "± run-to-run noise; differences within it are not signal." },
            confidence: { type: "integer", description: "0-100 evidence-backed confidence." },
            summary: { type: "string" },
            painkiller: { type: "boolean" },
            obtainable_revenue: { type: "string" },
            willingness_to_pay: { type: "string" },
            kill_test: { anyOf: [ref("KillTest"), { type: "null" }] },
            moat: { anyOf: [ref("Moat"), { type: "null" }] },
            criteria: { type: "array", items: ref("Criterion") },
            strengths: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
            competitors: { type: "array", items: ref("Competitor") },
            market_size: { type: "object", properties: { tam: { type: "string" }, sam: { type: "string" }, som: { type: "string" }, cagr_pct: { type: "number" } } },
            possible_alphas: { type: "array", items: { type: "object", properties: { alpha: { type: "string" }, rationale: { type: "string" } } } },
            evidence: { anyOf: [ref("Evidence"), { type: "null" }] },
          },
        },
        KillTest: {
          type: "object",
          description: "The one pre-registered test that would change the verdict.",
          properties: {
            riskiest_assumption: { type: "string" },
            cheapest_test: { type: "string" },
            pass_threshold: { type: "string" },
            kill_threshold: { type: "string" },
            would_flip: { type: "object", properties: { to_go: { type: "string" }, to_no_go: { type: "string" } } },
            pivotal_criterion: { type: "string" },
          },
        },
        Moat: {
          type: "object",
          properties: {
            today: { type: "string", description: "What stops a copycat today (often 'nothing yet')." },
            strongest: { type: "object", properties: { type: { type: "string" }, grade: { type: "string", enum: ["none", "weak", "plausible", "strong"] } } },
            to_build: { type: "array", items: { type: "object", properties: { path: { type: "string" }, becomes_true: { type: "string" } } } },
          },
        },
        Criterion: {
          type: "object",
          properties: { name: { type: "string" }, group: { type: "string" }, band: { type: "string" }, score: { type: "integer" }, explanation: { type: "string" } },
        },
        Competitor: {
          type: "object",
          properties: { name: { type: "string" }, note: { type: "string" }, complaint_theme: { type: "string" }, your_edge: { type: "string" } },
        },
        Evidence: {
          type: "object",
          description: "Real fetched posts behind the demand read (never model-asserted).",
          properties: {
            count: { type: "integer" },
            sources: { type: "object", additionalProperties: { type: "integer" } },
            top_signals: {
              type: "array",
              items: { type: "object", properties: { quote: { type: "string" }, url: { type: "string" }, source: { type: "string" }, tier: { type: "integer" }, wtp_signal: { type: "boolean" } } },
            },
          },
        },
        Refinement: {
          type: "object",
          properties: { statement: { type: "string" }, label: { type: "string" }, rationale: { type: "string" }, changes: { type: "array", items: { type: "object", properties: { change: { type: "string" }, targets: { type: "string" } } } }, expected_effect: { type: "string" } },
        },
        WedgeSet: {
          type: "object",
          properties: { wedges: { type: "array", items: { type: "object", properties: { wedge: { type: "string" }, statement: { type: "string" }, label: { type: "string" }, rationale: { type: "string" }, targets: { type: "string" } } } } },
        },
        Kit: {
          type: "object",
          properties: { who: { type: "string" }, where: { type: "array", items: { type: "string" } }, questions: { type: "array", items: { type: "string" } }, green_signals: { type: "array", items: { type: "string" } }, red_signals: { type: "array", items: { type: "string" } }, anti_bias: { type: "array", items: { type: "string" } }, outreach: { type: "object", properties: { dm: { type: "string" }, email: { type: "string" }, forum_post: { type: "string" } } }, tally: { type: "string" } },
        },
        Intel: {
          type: "object",
          properties: { one_liner: { type: "string" }, pricing_anchor: { type: "string" }, competitors: { type: "array", items: { type: "object", properties: { name: { type: "string" }, pricing: { type: "string" }, pricing_url: { type: "string" }, funding: { type: "string" }, funding_url: { type: "string" }, positioning: { type: "string" } } } } },
        },
        TestResult: {
          type: "object",
          properties: { outcome: { type: "string", enum: ["pass", "kill", "inconclusive"] }, reasoning: { type: "string" }, report: { type: "string" } },
        },
        Account: {
          type: "object",
          properties: { key_prefix: { type: "string" }, label: { type: "string" }, credits: { type: "integer", description: "-1 = unlimited." }, unlimited: { type: "boolean" }, created_at: { type: "string" } },
        },
      },
    },
  };
}
