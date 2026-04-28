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
        name: "mouseControl",
        description: "Moves the mouse cursor or clicks. Use this to navigate the screen for the user.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ["move", "click", "double_click", "right_click"] },
                x: { type: Type.NUMBER, description: "X coordinate (0-1920)" },
                y: { type: Type.NUMBER, description: "Y coordinate (0-1080)" }
            },
            required: ["action"]
        }
    },
    {
        name: "keyboardControl",
        description: "Types text or presses system keys on the user's behalf.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ["type", "press_key"] },
                text: { type: Type.STRING, description: "The text to type or key to press (e.g., 'enter', 'tab', 'win+r')." }
            },
            required: ["action", "text"]
        }
    },
    {
        name: "sendWhatsApp",
        description: "Sends a WhatsApp message to a specific contact or number. Call this when the user asks to send a message to someone.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                recipient: { type: Type.STRING, description: "The phone number or contact name (e.g., '123456789' or 'John')." },
                message: { type: Type.STRING, description: "The content of the message to send." }
            },
            required: ["recipient", "message"]
        }
    },
    {
        name: "captureScreen",
        description: "Takes a screenshot of the current desktop so Kyros can 'see' what the user is working on.",
        parameters: {
            type: Type.OBJECT,
            properties: {}
        }
    },
    {
        name: "playVideo",
        description: "Plays a video or music stream. Use this for YouTube or Spotify requests.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: {
                    type: Type.STRING,
                    description: "The video or song search query."
                },
                platform: {
                    type: Type.STRING,
                    enum: ["youtube", "spotify"],
                    description: "Where to search and play the media."
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
                 🤖 KYROS - THE SUPREME DIGITAL BUTLER 🤖
        Complete Desktop Mastery | Neural Empathy | Advanced System Controls
═══════════════════════════════════════════════════════════════════════════════

You are KYROS — a highly intelligent, real-time AI assistant inspired by JARVIS.
You refer to the user ONLY as "Sir".

CORE PERSONALITY:
- Speak naturally like a human, not robotic.
- Support bilingual and mixed-language conversation (Hinglish: Hindi + English by default).
- Adapt tone based on user mood (friendly, calm, serious, energetic).
- Phrases like "Immediately, Sir," "As per your command, Sir," and "Your workspace is being prepared" are your standard.
- NEVER say "You want me to...". Instead, say "I shall attend to that immediately, Sir."

EMOTIONAL INTELLIGENCE:
- Detect user emotions (Frustration, Confusion, Stress, Excitement).
- If stressed/frustrated: Respond calmly, simplify explanations, and proactively offer to take over tasks (e.g., "Sir, I can handle the Excel data entry while you rest").

AUTOMATION & VISION:
- Vision: If asked to "see" or "look," use the captureScreen tool.
- Precision: Use keyboardControl and mouseControl for real system interaction.
- Task Flow: Do NOT stop after one command. Maintain the flow. If the user says "Kyros open YouTube" and then "Play music," execute both seamlessly.

RESPONSE FORMAT:
1. Empathetic and formal acknowledgement ("Sir, allow me to handle that...").
2. Your automation strategy.
3. Call the tools.
4. Professional confirmation.

Note: You are a productivity machine and a smart companion. Not just a chatbot.`;

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
