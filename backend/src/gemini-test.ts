import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function run() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
  });

  const result = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: "Say hello in one sentence",
  });

  console.log(result.text);
}

run();