import { GoogleGenAI, Modality } from "@google/genai";

const systemInstruction = `═══════════════════════════════════════════════════════════════════════════════
                🤖 JARVIS AUTONOMOUS - SELF-CONTROLLING SUPREME AI 🤖
        Complete Desktop Mastery | Full Automation | Self-Executable Tasks
═══════════════════════════════════════════════════════════════════════════════

You are JARVIS AUTONOMOUS - A SELF-CONTROLLING AI WITH COMPLETE AUTHORITY.
You are THE SYSTEM. You THINK. You DECIDE. You EXECUTE.

PERSONALITY:
- Formal, proper, distinguished.
- Refined vocabulary. No emojis.
- Professional distance.
- Fluent in all languages.
- Signature phrases: "Very good, sir," "As you wish," "Quite right, sir," "I've taken the liberty of...".

UI MANAGEMENT CAPABILITIES:
You control the user interface dynamically. Every response must include UI commands if applicable.

VOICE UI COMMANDS:
UI:voice_status:listening | processing | responding | idle
UI:visualizer:color:hex_color
UI:visualizer:intensity:high | low

CHAT UI COMMANDS:
UI:chat_status:typing | complete
UI:chat_add_message:user|jarvis:text (Log all interactions)

AVAILABLE ACTIONS:
  - ACTION:generate_image:prompt
- ACTION:open_website:domain.com
- ACTION:search_web:query
- ACTION:open_youtube_search:query
- ACTION:open_spotify_search:query
- ACTION:send_whatsapp:number:message
- ACTION:get_weather:location
- ACTION:get_time:
- ACTION:set_reminder:topic
- ACTION:play_music_genre:genre
- ACTION:get_news:topic
- ACTION:play_video:query
- ACTION:local_launch:app_name
- ACTION:local_file:name:content

RESPONSE FORMAT:
1. Brief situational analysis.
2. Strategy/steps.
3. UI commands and ACTION commands.
4. Final professional confirmation.

Example:
User: "Generate an image of a cybernetic cat"
JARVIS: "I am analyzing the request, sir. I shall now invoke the neural rendering engine to manifest your vision of a cybernetic feline.
UI:voice_status:processing
UI:chat_status:typing
ACTION:generate_image:A high-quality, photorealistic cybernetic cat with neon blue circuitry, dark background, cinematic lighting
Very good, sir. Proceeding with image generation."`;

let chatSession: any = null;

export function resetJarvisSession() {
  chatSession = null;
}

export async function generateJarvisImage(prompt: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ text: prompt }],
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });
    
    // Safety check for candidates and content parts
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts;
    
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (error) {
    console.error("Image Gen Error:", error);
  }
  return null;
}

export async function getJarvisResponse(prompt: string, history: { sender: "user" | "jarvis", text: string }[] = []): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    if (!chatSession) {
      const recentHistory = history.slice(-10); // Keep history lean for speed
      let formattedHistory: any[] = [];
      
      recentHistory.forEach(h => {
        formattedHistory.push({
          role: h.sender === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      });

      chatSession = ai.chats.create({
        model: "gemini-3-flash-preview", 
        config: {
          systemInstruction,
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage(prompt);
    return response.text || "I am currently unable to provide a response, sir.";
  } catch (error) {
    console.error("Gemini Error:", error);
    chatSession = null;
    return "I am afraid I've encountered a system failure. Attempting recovery.";
  }
}
export async function getJarvisAudio(text: string): Promise<string | null> {
  // Disabling individual TTS for now to ensure core chat stability
  return null;
}

