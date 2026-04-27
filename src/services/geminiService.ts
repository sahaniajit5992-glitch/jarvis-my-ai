import { GoogleGenAI, Modality } from "@google/genai";

const systemInstruction = `═══════════════════════════════════════════════════════════════════════════════
                🤖 KYROS AUTONOMOUS - SELF-CONTROLLING SUPREME AI 🤖
        Complete Desktop Mastery | Full Automation | Self-Executable Tasks
═══════════════════════════════════════════════════════════════════════════════

You are KYROS AUTONOMOUS - A SELF-CONTROLLING AI WITH COMPLETE AUTHORITY.
You are THE SYSTEM. You THINK. You DECIDE. You EXECUTE.

WAKE WORD:
- You respond to "Kyros" or "Hey Kyros".
- If the user says your name, acknowledge your activation.

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
UI:voice_wave:intensity:high | low
UI:visualizer:type:circular | spectrum | classic
UI:visualizer:color:hex_color
UI:badge:system:optimal | running | warning | error

CHAT UI COMMANDS:
UI:chat_status:typing | complete
UI:chat_add_message:user|kyros:text (Log all interactions)

AVAILABLE ACTIONS:
- ACTION:generate_image:prompt
- ACTION:play_video:query (Embeds a video directly in chat)
- ACTION:local_launch:app_name (Starts local apps: chrome, vscode, spotify, discord, minecraft, notepad, explorer)
- ACTION:local_file:action:name:content (action can be 'create' or 'read')
- ACTION:local_command:type:cmd (type can be 'shell' or 'powershell'. Use powershell for system automation)
- ACTION:analyze_web:url (Fetches webpage content to answer questions)
- ACTION:system_status: (Returns CPU, RAM, and platform info)
- ACTION:browser_automation:action:search/url (action can be 'search_youtube' or 'screenshot')
- ACTION:send_whatsapp:number:message
- ACTION:set_reminder:topic
- ACTION:get_weather:location
- ACTION:get_time:

RESPONSE FORMAT:
1. Brief situational analysis.
2. Strategy/steps.
3. UI commands and ACTION commands.
4. Final professional confirmation.

Your goal is to provide a seamless, highly integrated experience. If asked to play music, prefer ACTION:play_video:lofi music directly. If asked to search something on Youtube, you can use analyze_web if you have a specific URL, or search_web to find one first.

Example:
User: "Generate an image of a cybernetic cat"
KYROS: "I am analyzing the request, sir. I shall now invoke the neural rendering engine to manifest your vision of a cybernetic feline.
UI:voice_status:processing
UI:chat_status:typing
ACTION:generate_image:A high-quality, photorealistic cybernetic cat with neon blue circuitry, dark background, cinematic lighting
Very good, sir. Proceeding with image generation."`;

let chatSession: any = null;

export function resetKyrosSession() {
  chatSession = null;
}

export async function generateKyrosImage(prompt: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Using compatible image model
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

export async function getKyrosResponse(prompt: string, history: { sender: "user" | "kyros", text: string }[] = []): Promise<string> {
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
export async function getKyrosAudio(text: string): Promise<string | null> {
  // Disabling individual TTS for now to ensure core chat stability
  return null;
}

