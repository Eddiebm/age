import OpenAI from "openai";

/**
 * OpenRouter uses the OpenAI-compatible API. Set OPENROUTER_API_KEY (recommended).
 * If unset, falls back to OPENAI_API_KEY against api.openai.com.
 *
 * @see https://openrouter.ai/docs
 */
export function createChatClient(): { client: OpenAI; model: string } {
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (openrouterKey) {
    const baseURL =
      process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1";
    const referer =
      process.env.OPENROUTER_HTTP_REFERER?.trim() ||
      process.env.NEXTAUTH_URL?.trim() ||
      "";
    const title = process.env.OPENROUTER_APP_TITLE?.trim() || "AGE";

    const defaultHeaders: Record<string, string> = {
      "X-Title": title,
    };
    if (referer) {
      defaultHeaders["HTTP-Referer"] = referer;
    }

    return {
      client: new OpenAI({
        apiKey: openrouterKey,
        baseURL,
        defaultHeaders,
      }),
      model: process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini",
    };
  }

  if (openaiKey) {
    return {
      client: new OpenAI({ apiKey: openaiKey }),
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    };
  }

  throw new Error(
    "Set OPENROUTER_API_KEY (OpenRouter) or OPENAI_API_KEY (OpenAI direct) to run the engine.",
  );
}
