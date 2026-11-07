// Server-side LLM access. Prefers GMI Cloud (OpenAI-compatible inference),
// then Anthropic, then OpenAI. Keys never leave the server.

export type LlmProvider = { provider: "gmi" | "anthropic" | "openai"; model: string; label: string };

export const GMI_DEFAULT_MODEL = "deepseek-ai/DeepSeek-V4.1-Flash";

export function llmProvider(): LlmProvider | null {
  if (process.env.GMI_API_KEY) {
    const model = process.env.GMI_MODEL || GMI_DEFAULT_MODEL;
    return { provider: "gmi", model, label: `GMI Cloud · ${model.split("/").pop()}` };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
    return { provider: "anthropic", model, label: `Claude · ${model}` };
  }
  if (process.env.OPENAI_API_KEY) return { provider: "openai", model: "gpt-4o-mini", label: "OpenAI · gpt-4o-mini" };
  return null;
}

export async function chat(prompt: string, opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {}): Promise<{ text: string; via: LlmProvider } | null> {
  const p = llmProvider();
  if (!p) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45_000);
  try {
    if (p.provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: p.model, max_tokens: opts.maxTokens ?? 900, messages: [{ role: "user", content: prompt }] }),
      });
      const j = await r.json();
      return { text: j?.content?.[0]?.text || "", via: p };
    }
    const gmi = p.provider === "gmi";
    const r = await fetch(gmi ? `${process.env.GMI_BASE_URL || "https://api.gmi-serving.com/v1"}/chat/completions` : "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { authorization: `Bearer ${gmi ? process.env.GMI_API_KEY : process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      // GMI's DeepSeek/Qwen models think by default and can spend the whole budget on
      // hidden reasoning; "none" returns the answer directly (~1.5s) for these structured tasks.
      body: JSON.stringify({
        model: p.model,
        messages: [{ role: "user", content: prompt }],
        temperature: opts.temperature ?? 0.6,
        max_tokens: (opts.maxTokens ?? 900) + 400,
        ...(gmi ? { reasoning_effort: process.env.GMI_REASONING_EFFORT || "none" } : {}),
      }),
    });
    const j = await r.json();
    return { text: j?.choices?.[0]?.message?.content || "", via: p };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function parseJson<T>(text: string): T | null {
  const m = text.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}
