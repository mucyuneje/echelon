import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";


let _model: GenerativeModel | null = null;

export function getGeminiModel(): GenerativeModel {
  if (!_model) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    _model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // faster & cheaper than pro, still excellent
      generationConfig: {
        temperature: 0.2,       // low temp = consistent, structured output
        topP: 0.8,
        maxOutputTokens: 8192,
      },
    });
  }
  return _model;
}

// Safe JSON extractor - strips markdown fences if Gemini wraps in ```json
export function extractJSON(text: string): string {
  // Remove ```json ... ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  // Try to find first { or [ and last } or ]
  const start = text.search(/[\[{]/);
  const endBrace = text.lastIndexOf("}");
  const endBracket = text.lastIndexOf("]");
  const end = Math.max(endBrace, endBracket);
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

// Retry wrapper for Gemini calls (handles rate limits)
export async function callGeminiWithRetry(
  prompt: string,
  maxRetries = 3
): Promise<string> {
  const model = getGeminiModel();
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      // Exponential backoff
      const wait = attempt * 1500;
      console.warn(`Gemini attempt ${attempt} failed, retrying in ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("Gemini call failed after all retries");
}
