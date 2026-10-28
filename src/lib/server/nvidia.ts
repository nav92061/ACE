/** NVIDIA's OpenAI-compatible chat endpoint (build.nvidia.com). Server-only. */

const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

/** Tried in order; later models are used if an earlier one is unavailable or rate limited. */
export const NVIDIA_MODELS = (
  process.env.NVIDIA_MODELS || "nvidia/nemotron-3-ultra-550b-a55b,nvidia/nemotron-3.5-super-vl-120b-a12b"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export class NvidiaError extends Error {
  constructor(
    public code: "bad_key" | "rate_limited" | "api_error" | "network",
    message: string,
  ) {
    super(message);
  }
}

/** One chat call with model fallback. Returns the reply text. */
export async function nvidiaChat(opts: {
  system: string;
  user: string;
  maxTokens: number;
  timeoutMs: number;
}): Promise<string> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new NvidiaError("bad_key", "NVIDIA_API_KEY is not set.");
  let last: NvidiaError = new NvidiaError("api_error", "No NVIDIA model answered.");
  for (const model of NVIDIA_MODELS) {
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          max_tokens: opts.maxTokens,
          temperature: 0.6,
          top_p: 0.95,
          // Reasoning models answer faster with clean JSON when thinking is off.
          chat_template_kwargs: { enable_thinking: false },
        }),
        signal: AbortSignal.timeout(opts.timeoutMs),
      });
    } catch {
      last = new NvidiaError("network", "Couldn't reach NVIDIA's API in time. Try again.");
      continue;
    }
    if (res.status === 401) throw new NvidiaError("bad_key", "The NVIDIA API key was rejected. Check NVIDIA_API_KEY.");
    if (res.status === 429) {
      last = new NvidiaError("rate_limited", "Too many requests right now. Wait a moment and try again.");
      continue;
    }
    if (res.status === 403 || res.status === 404) {
      last = new NvidiaError("api_error", `Model ${model} isn't available on this NVIDIA key.`);
      continue;
    }
    if (!res.ok) {
      last = new NvidiaError("api_error", `NVIDIA API error ${res.status}. Try again.`);
      continue;
    }
    const data = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
    } | null;
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (text.trim()) return text;
    last = new NvidiaError("api_error", "NVIDIA returned an empty reply. Try again.");
  }
  throw last;
}

/**
 * Pull the first JSON object out of a model reply. Strips <think> blocks and code
 * fences, and escapes lone LaTeX backslashes inside $...$ (a bare "\frac" would
 * otherwise parse as a form feed plus "rac").
 */
export function extractJSON(text: string): unknown {
  let s = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s\S]*?<\/think>/i, "")
    .replace(/```(?:json)?/gi, "");
  s = s.replace(/\$[^$"]*\$/g, (math) => math.replace(/(?<!\\)\\(?=[a-zA-Z])/g, "\\\\"));
  const start = s.indexOf("{");
  if (start < 0) throw new Error("No JSON object in reply");
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = end > 0 ? s.slice(start, end + 1) : s.slice(start);
  try {
    return JSON.parse(body);
  } catch {
    return JSON.parse(body.replace(/,\s*([}\]])/g, "$1"));
  }
}
