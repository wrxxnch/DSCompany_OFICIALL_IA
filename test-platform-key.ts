import { GoogleGenAI } from "@google/genai";

async function testPlatformKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in environment");
    return;
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    console.log("Testing platform key with googleSearch...");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Quais são as 3 melhores pizzarias em São Paulo com telefone e endereço?",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    console.log("Response:", response.text);
  } catch (error: any) {
    console.error("Error:", error.message || error);
  }
}

testPlatformKey();
