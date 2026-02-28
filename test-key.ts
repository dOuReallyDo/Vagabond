import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Checking API Key...");
  
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY is missing from process.env");
    process.exit(1);
  }

  console.log(`Key found. Length: ${apiKey.length}`);
  console.log(`First 4 chars: ${apiKey.substring(0, 4)}`);

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    console.log("Attempting to generate content...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello, are you working?",
    });
    console.log("✅ API Call Successful!");
    console.log("Response:", response.text);
  } catch (error: any) {
    console.error("❌ API Call Failed:");
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

test();
