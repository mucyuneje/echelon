import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let _model: GenerativeModel | null = null;

export function getGeminiModel(): GenerativeModel {
  if (!_model) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    _model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        temperature: 0.2,           // low temp = consistent, structured output
        topP: 0.8,
        maxOutputTokens: 8192,
      },
    });
  }
  return _model;
}

// Reset the singleton — called when a non-retryable API error occurs so that
// a bad initialisation state doesn't lock the process across requests.
export function resetGeminiModel(): void {
  _model = null;
}

// Safe JSON extractor - strips markdown fences if Gemini wraps in ```json
export function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = text.search(/[\[{]/);
  const endBrace = text.lastIndexOf("}");
  const endBracket = text.lastIndexOf("]");
  const end = Math.max(endBrace, endBracket);
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

// HTTP status codes / messages that are worth retrying
function isRetryable(error: any): boolean {
  const msg: string = error?.message ?? "";
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("500") ||
    msg.toLowerCase().includes("rate limit") ||
    msg.toLowerCase().includes("high demand") ||
    msg.toLowerCase().includes("temporarily")
  );
}

// Retry wrapper with true exponential backoff + jitter
export async function callGeminiWithRetry(
  prompt: string,
  maxRetries = 3
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = getGeminiModel();
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      const retryable = isRetryable(error);

      // Non-retryable (e.g. 404 wrong model): reset singleton so next request
      // can re-initialise, then surface the error immediately.
      if (!retryable) {
        resetGeminiModel();
        throw error;
      }

      if (attempt === maxRetries) throw error;

      // Exponential backoff: 2s → 4s → 8s, with ±20% jitter
      const baseWait = Math.pow(2, attempt) * 1000;
      const jitter = baseWait * 0.2 * (Math.random() * 2 - 1);
      const wait = Math.round(baseWait + jitter);
      console.warn(
        `Gemini attempt ${attempt} failed, retrying in ${wait}ms… (${error.message})`
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("Gemini call failed after all retries");
}
