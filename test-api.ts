import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function testApi() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log("------------------------------------------");
  console.log("🛡️  KYROS API DIAGNOSTIC TOOL");
  console.log("------------------------------------------");

  if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY environment variable is not set.");
    console.log("\n💡 TO FIX THIS:");
    console.log("1. Go to AI Studio Settings (Gear icon ⚙️)");
    console.log("2. Find 'Environment Variables' or 'Secrets'");
    console.log("3. Add GEMINI_API_KEY with your key from https://aistudio.google.com/app/apikey");
    console.log("\nOR run locally with:");
    console.log("   $env:GEMINI_API_KEY='your_key_here'; npm run test:api");
    process.exit(1);
  }

  console.log("📡 Validating connection to Google Generative AI...");
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    // Using a basic text model for simple verification
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: "Respond with 'Connected' if you can hear me." }] }]
    });

    console.log("✅ SUCCESS: API Key is working!");
    console.log("🤖 Model Response:", response.candidates[0].content.parts[0].text);
  } catch (error: any) {
    console.error("❌ API ERROR:", error.message);
    if (error.message.includes("API_KEY_INVALID")) {
      console.error("💡 Tip: Your API key appears to be invalid. Check Google AI Studio.");
    }
  }
}

testApi();
