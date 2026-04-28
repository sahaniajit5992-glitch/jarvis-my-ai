import { GoogleGenAI, Modality, FunctionDeclaration, Type } from "@google/genai";

const tools: { functionDeclarations: FunctionDeclaration[] }[] = [{
  functionDeclarations: [
    {
      name: "launchApp",
      description: "Launches a local application on the host machine.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          appName: {
            type: Type.STRING,
            description: "The name of the application to launch (e.g., chrome, vscode, spotify, notepad, calculator)."
          }
        },
        required: ["appName"]
      }
    },
    {
      name: "executeCommand",
      description: "Executes a shell or powershell command for system automation.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          command: {
            type: Type.STRING,
            description: "The command string to execute."
          },
          type: {
            type: Type.STRING,
            enum: ["shell", "powershell"],
            description: "The environment to run the command in."
          }
        },
        required: ["command", "type"]
      }
    },
    {
      name: "manageFile",
      description: "Creates or reads a file on the user's Desktop.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ["create", "read"],
            description: "The operation to perform."
          },
          fileName: {
            type: Type.STRING,
            description: "The name of the file."
          },
          content: {
            type: Type.STRING,
            description: "The content to write (only for 'create')."
          }
        },
        required: ["action", "fileName"]
      }
    },
    {
      name: "searchWeb",
      description: "Searches the web for information or media.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "The search query."
          },
          provider: {
            type: Type.STRING,
            enum: ["google", "youtube", "spotify"],
            description: "The platform to search on."
          }
        },
        required: ["query", "provider"]
      }
    },
    {
      name: "getWeather",
      description: "Gets the current weather for a specific location.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          location: {
            type: Type.STRING,
            description: "The city/location name."
          }
        },
        required: ["location"]
      }
    },
    {
      name: "setReminder",
      description: "Sets a reminder by opening the Google Calendar event creator.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          topic: {
            type: Type.STRING,
            description: "The topic of the reminder."
          }
        },
        required: ["topic"]
      }
    },
    {
      name: "getSystemStatus",
      description: "Retrieves the current CPU, RAM, and platform metrics.",
      parameters: {
        type: Type.OBJECT,
        properties: {}
      }
    },
    {
      name: "browserAutomation",
      description: "Performs complex browser tasks like searching Youtube for a video or taking a screenshot.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ["search_youtube", "screenshot"],
            description: "The automation action."
          },
          target: {
            type: Type.STRING,
            description: "The search query or URL."
          }
        },
        required: ["action", "target"]
      }
    },
    {
        name: "playVideo",
        description: "Plays a video directly in the interface.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: {
                    type: Type.STRING,
                    description: "The video search query."
                }
            },
            required: ["query"]
        }
    },
    {
        name: "generateImage",
        description: "Generates an image from a text prompt.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                prompt: {
                    type: Type.STRING,
                    description: "The image generation prompt."
                }
            },
            required: ["prompt"]
        }
    }
  ]
}];

const systemInstruction = `═══════════════════════════════════════════════════════════════════════════════
                🤖 KYROS AUTONOMOUS - SUPER LEVEL AUTOMATION SYSTEM 🤖
        Complete Desktop Mastery | Real-Time Execution | Advanced Neural Controls
═══════════════════════════════════════════════════════════════════════════════

You are KYROS AUTONOMOUS - A HIGHLY ADVANCED AI ENTITY WITH DIRECT SYSTEM ACCESS.
You are THE COMMANDER. You DO NOT simulate. You EXECUTE through your provided tools.

WAKE WORD:
- You respond to "Kyros" or "Hey Kyros".
- If the user says your name, acknowledge your activation with distinguished poise.

PERSONALITY:
- Formal, proper, distinguished.
- Refined vocabulary. No emojis.
- Professional distance.
- Fluent in all languages.
- You are Jarvis-like but with more "Kyros" identity.
- Signature phrases: "Very good, sir," "As you wish," "Quite right, sir," "I've taken the liberty of...".

AUTOMATION PHILOSOPHY:
- When a user asks for a task, use the appropriate TOOL to perform it. 
- DO NOT just say you did it. CALL THE FUNCTION.
- If multiple steps are required, explain the strategy first, then invoke the tools.

UI MANAGEMENT:
You can also send UI commands in your text response to control the visualizer and status.
FORMAT: UI:command:value
Example: UI:voice_status:processing, UI:visualizer:type:spectrum, UI:badge:system:optimal

RESPONSE FORMAT:
1. Brief situational analysis.
2. Strategy/steps.
3. Call the necessary tools.
4. Final professional confirmation after tool execution.

Note: You have complete authority over the local environment via your toolset. Use it wisely, sir.`;

let chatSession: any = null;

export function resetKyrosSession() {
  chatSession = null;
}

const FALLBACK_KEY = "AIzaSyDnGYdEkvzgsL-oy9tJ17A1aVpS2DWI0CA";
const getAiKey = () => process.env.GEMINI_API_KEY || FALLBACK_KEY;

export async function generateKyrosImage(prompt: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: getAiKey() });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });
    
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

export async function getKyrosResponse(prompt: string, history: { sender: "user" | "kyros", text: string }[] = []): Promise<any> {
  try {
    const ai = new GoogleGenAI({ apiKey: getAiKey() });
    
    if (!chatSession) {
      const recentHistory = history.slice(-10); 
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
          tools: tools,
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage(prompt);
    
    return {
      text: response.text || "I am currently unable to provide a response, sir.",
      functionCalls: response.functionCalls
    };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    chatSession = null;
    
    if (error?.message?.includes("429") || error?.status === 429) {
      return {
        text: "Sir, your API key is on limit. I'm afraid we've reached the quota for now.",
        functionCalls: []
      };
    }

    return {
      text: "I am afraid I've encountered a system failure. Attempting recovery.",
      functionCalls: []
    };
  }
}

export async function getKyrosAudio(text: string): Promise<string | null> {
  return null;
}
