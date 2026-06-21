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

export type GenerateResult<T> = {
  data: T;
  sources: Source[];
  model: string;
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
): Promise<{ text: string; sources: Source[] }> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 4500,
    response_format: { type: "json_object" },
  };
  if (opts.grounded) {
    // OpenRouter web-search plugin — adds cited results, no extra API key.
    body.plugins = [{ id: "web", max_results: 5 }];
  }
  // The `plugins` field is OpenRouter-specific and not in the OpenAI SDK types.
  const completion = await client().chat.completions.create(body as never);
  const message = (completion as { choices: { message: RawMessage }[] }).choices[0]
    ?.message;
  if (!message) throw new Error("Empty response from model");
  return { text: message.content ?? "", sources: extractSources(message) };
}

/**
 * Run a generation and return data validated against a Zod schema.
 * Uses OpenRouter (json_object mode) with one self-repair retry on parse/validation failure.
 */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  opts: GenerateOptions
): Promise<GenerateResult<T>> {
  const model = resolveModel(opts.role ?? "reasoning");
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
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, sources } = await call(model, messages, opts);
    if (sources.length) lastSources = sources;
    try {
      const parsed = JSON.parse(extractJson(text));
      const data = schema.parse(parsed);
      return { data, sources: sources.length ? sources : lastSources, model };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      // Feed the bad output back for a single repair attempt.
      messages.push({ role: "assistant", content: text });
      messages.push({
        role: "user",
        content: `That response failed validation: ${lastErr}. Reply again with ONLY the corrected JSON object.`,
      });
    }
  }
  throw new Error(`Model output failed validation after retry: ${lastErr}`);
}
