import OpenAI from "openai";
import { z } from "zod";
import { ModelRole, resolveModel } from "./models";

// Single OpenRouter client. All AI calls go through here, server-side only.
let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Copy .env.example to .env.local and add your key from https://openrouter.ai/keys"
    );
  }
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_APP_URL ?? "http://localhost:3000",
        "X-Title": "IdeaValidator",
      },
    });
  }
  return _client;
}

export type Source = { title: string; url: string };

export type GenerateOptions = {
  role?: ModelRole;
  system: string;
  prompt: string;
  /** Enable OpenRouter's live web-search plugin for grounded, cited output. */
  grounded?: boolean;
  maxTokens?: number;
  temperature?: number;
};

export type Usage = { prompt_tokens: number; completion_tokens: number; cost: number };

export type GenerateResult<T> = {
  data: T;
  sources: Source[];
  model: string;
  usage: Usage;
};

// Pull a JSON object out of a model response that may be wrapped in prose or ```json fences.
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response");
  }
  return body.slice(start, end + 1);
}

type RawMessage = {
  content?: string | null;
  annotations?: Array<{
    type?: string;
    url_citation?: { url?: string; title?: string };
  }>;
};

function extractSources(message: RawMessage): Source[] {
  const out: Source[] = [];
  for (const a of message.annotations ?? []) {
    if (a.type === "url_citation" && a.url_citation?.url) {
      out.push({
        url: a.url_citation.url,
        title: a.url_citation.title || a.url_citation.url,
      });
    }
  }
  // de-dupe by url
  return out.filter((s, i) => out.findIndex((o) => o.url === s.url) === i);
}

async function call(
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts: GenerateOptions
): Promise<{ text: string; sources: Source[]; usage: Usage; finishReason: string | null }> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 4500,
    response_format: { type: "json_object" },
    usage: { include: true }, // ask OpenRouter to return token + cost accounting
  };
  if (opts.grounded) {
    // OpenRouter web-search plugin — adds cited results, no extra API key.
    body.plugins = [{ id: "web", max_results: 5 }];
  }
  // The `plugins`/`usage` fields are OpenRouter-specific and not in the OpenAI SDK types.
  const completion = await client().chat.completions.create(body as never);
  const data = completion as {
    choices: { message: RawMessage; finish_reason?: string | null }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  };
  const choice = data.choices[0];
  const message = choice?.message;
  if (!message) throw new Error("Empty response from model");
  const u = data.usage ?? {};
  return {
    text: message.content ?? "",
    sources: extractSources(message),
    usage: {
      prompt_tokens: u.prompt_tokens ?? 0,
      completion_tokens: u.completion_tokens ?? 0,
      cost: u.cost ?? 0,
    },
    finishReason: choice?.finish_reason ?? null,
  };
}

/**
 * Run a generation and return data validated against a Zod schema.
 * Uses OpenRouter (json_object mode) with one self-repair retry on parse/validation failure.
 */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  opts: GenerateOptions
): Promise<GenerateResult<T>> {
  const model = resolveModel(opts.role ?? "writing");
  const system =
    opts.system +
    "\n\nReturn ONLY a single valid JSON object matching the requested shape. " +
    "No markdown, no code fences, no commentary.";

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: system },
    { role: "user", content: opts.prompt },
  ];

  let lastErr = "";
  let lastSources: Source[] = [];
  let lastFinish: string | null = null;
  let lastLen = 0;
  const usage: Usage = { prompt_tokens: 0, completion_tokens: 0, cost: 0 };
  const baseMax = opts.maxTokens ?? 4500;
  for (let attempt = 0; attempt < 2; attempt++) {
    // On the repair attempt, give more room in case the first was truncated.
    const maxTokens = attempt === 0 ? baseMax : Math.min(Math.round(baseMax * 1.6), 16000);
    const res = await call(model, messages, { ...opts, maxTokens });
    const { text, sources, finishReason } = res;
    lastFinish = finishReason;
    lastLen = text.length;
    // Accumulate across the self-repair retry — both calls cost money.
    usage.prompt_tokens += res.usage.prompt_tokens;
    usage.completion_tokens += res.usage.completion_tokens;
    usage.cost += res.usage.cost;
    if (sources.length) lastSources = sources;
    try {
      const parsed = JSON.parse(extractJson(text));
      const data = schema.parse(parsed);
      return { data, sources: sources.length ? sources : lastSources, model, usage };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      console.warn(
        `[ai] ${model} attempt ${attempt + 1} failed: ${lastErr} | finish=${finishReason} len=${text.length} preview=${JSON.stringify(
          text.slice(0, 140)
        )}`
      );
      // Feed the bad output back for a single repair attempt.
      messages.push({ role: "assistant", content: text || "(empty response)" });
      messages.push({
        role: "user",
        content:
          finishReason === "length"
            ? `Your previous reply was cut off before the JSON was complete. Reply again with ONLY the COMPLETE, valid JSON object — be more concise so it fits.`
            : `That response failed: ${lastErr}. Reply again with ONLY a single valid JSON object — no prose, no markdown, no code fences.`,
      });
    }
  }
  const hint =
    lastFinish === "length"
      ? " — the model's output was truncated (raise the generator's maxTokens, or use a model that spends fewer reasoning tokens)."
      : lastLen === 0
        ? " — the model returned empty content (it may have refused or spent its budget on reasoning)."
        : "";
  throw new Error(
    `Model output failed validation after retry (model=${model}, finish=${lastFinish}, len=${lastLen})${hint}: ${lastErr}`
  );
}

/** Plain free-text generation (no JSON) — for the "ask about this analysis" chat. */
export async function generateText(opts: {
  role?: ModelRole;
  system: string;
  prompt: string;
  grounded?: boolean;
  maxTokens?: number;
}): Promise<{ text: string; usage: Usage; model: string }> {
  const model = resolveModel(opts.role ?? "writing");
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
    temperature: 0.4,
    max_tokens: opts.maxTokens ?? 1200,
    usage: { include: true },
  };
  if (opts.grounded) body.plugins = [{ id: "web", max_results: 5 }];
  const completion = await client().chat.completions.create(body as never);
  const data = completion as {
    choices: { message: RawMessage }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  };
  const u = data.usage ?? {};
  return {
    text: data.choices[0]?.message?.content ?? "",
    usage: {
      prompt_tokens: u.prompt_tokens ?? 0,
      completion_tokens: u.completion_tokens ?? 0,
      cost: u.cost ?? 0,
    },
    model,
  };
}
