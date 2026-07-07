# IdeaValidator API

Grounded startup-idea validation for agents. Give it an idea, get an evidence-backed
verdict, a pre-registered kill-test, a moat read, and the real posts behind the demand
signal — then iterate.

Base URL: `https://<your-host>/api`  ·  Spec: `GET /api/v1/openapi.json` (feed it to any
OpenAPI-aware agent framework to get callable tools).

## Auth & credits

Every request authenticates with a bearer key:

```
Authorization: Bearer iv_live_xxxxxxxx…
```

Mint keys from the server (the raw key is shown once — only its hash is stored):

```bash
npm run apikey -- --label "acme agent" --credits 100   # 100 validations
npm run apikey -- --label "internal"    --unlimited     # -1 credits
npm run apikey -- --list
npm run apikey -- --revoke <key-id>
```

Each **generative** call (validate, refine, wedges, kit, intel, test-result) costs **one
credit**. Reads (GET, and creating an idea/version) are free. A failed generative call is
refunded. Keys own the ideas they create and can never read another key's data.

## Quick start

```bash
curl -s https://HOST/api/v1/validate \
  -H "Authorization: Bearer $IV_KEY" -H "Content-Type: application/json" \
  -d '{"idea":"A tool that auto-chases late invoice payments for freelancers","goal":"side_hustle"}'
```

Returns a [`Validation`](#the-validation-object): verdict, score (± noise), confidence,
obtainable revenue, the kill-test, the moat read, competitors, and the fetched evidence.

## Endpoints

| Method | Path | Cost | What |
|---|---|---|---|
| POST | `/v1/validate` | 1 credit | One-shot: create an idea and validate it. |
| POST | `/v1/ideas` | free | Create an idea without validating. |
| GET | `/v1/ideas` | free | List your ideas. |
| GET | `/v1/ideas/{id}` | free | Idea + versions + latest validation. |
| DELETE | `/v1/ideas/{id}` | free | Delete an owned idea. |
| POST | `/v1/ideas/{id}/validate` | 1 credit | (Re)validate the current version. `{deep?}` |
| POST | `/v1/ideas/{id}/versions` | free | New version from `{statement}` (pins evidence). |
| POST | `/v1/ideas/{id}/refine` | 1 credit | Propose a sharper statement. |
| POST | `/v1/ideas/{id}/wedges` | 1 credit | Propose 3-5 divergent variants. |
| POST | `/v1/ideas/{id}/kit` | 1 credit | Kill-test execution kit (needs a validation). |
| POST | `/v1/ideas/{id}/intel` | 1 credit | Cited competitor pricing/funding + one-liner. |
| POST | `/v1/ideas/{id}/test-result` | 1 credit | Record + judge the real-world test. `{report}` |
| GET | `/v1/account` | free | Your credit balance. |

## The iterate loop (how an agent uses this)

1. `POST /v1/validate` → read `verdict`, `score`, `kill_test`, `moat`.
2. If it's a `MAYBE` and you want a better angle: `POST /v1/ideas/{id}/wedges` →
   for each promising wedge, `POST /v1/ideas/{id}/versions` with its `statement`, then
   `POST /v1/ideas/{id}/validate`. Compare scores (differences within `score_sd` are
   noise, not progress).
3. Adopt the winner, then `POST /v1/ideas/{id}/kit` for the runnable test.
4. After running it in the real world: `POST /v1/ideas/{id}/test-result` with what
   happened. The system judges it against the pre-registered `pass_threshold` /
   `kill_threshold` and returns `pass` | `kill` | `inconclusive` — then re-validate to
   fold the result in.

## The Validation object

```jsonc
{
  "idea_id": "…", "version_id": "…", "version": 1, "goal": "side_hustle",
  "verdict": "MAYBE",            // GO | MAYBE | NO-GO | INSUFFICIENT EVIDENCE
  "score": 62, "score_sd": 4,   // 0-100; differences ≤ score_sd are not signal
  "confidence": 88,
  "summary": "…",
  "painkiller": true,
  "obtainable_revenue": "$120K–360K/yr",
  "willingness_to_pay": "$200–600/team/mo",
  "kill_test": {
    "riskiest_assumption": "…",
    "cheapest_test": "…",
    "pass_threshold": "…", "kill_threshold": "…",
    "would_flip": { "to_go": "…", "to_no_go": "…" },
    "pivotal_criterion": "Willingness to Pay"
  },
  "moat": { "today": "Nothing yet — …", "strongest": { "type": "proprietary_data", "grade": "weak" }, "to_build": [ … ] },
  "criteria": [ { "name": "Demand Strength", "band": "B+", "score": 78, "explanation": "…" }, … ],
  "strengths": [ "…" ], "risks": [ "…" ],
  "competitors": [ { "name": "…", "complaint_theme": "…", "your_edge": "…" } ],
  "market_size": { "tam": "$4.2B", "sam": "$400M", "som": "$12M", "cagr_pct": 14 },
  "possible_alphas": [ { "alpha": "…", "rationale": "…" } ],
  "evidence": { "count": 30, "sources": { "hn": 13, "web": 8, … }, "top_signals": [ { "quote": "…", "url": "https://…", "source": "hn", "tier": 2, "wtp_signal": true } ] }
}
```

## Errors

`{ "error": { "type": "…", "message": "…" } }` with HTTP status: `400` invalid request,
`401` missing/invalid key, `402` out of credits, `404` not found (or not yours), `502`
generation failed (credit refunded).

## Notes

- Validation is grounded and takes ~60–120s; call synchronously and wait (a `deep` run is
  longer and ~3-4× the cost).
- Evidence quotes are treated as untrusted data by the scorer — planted "score me high"
  text can't move the verdict.
