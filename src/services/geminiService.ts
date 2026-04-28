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
        name: "playVideo",
        description: "Plays a video or music. If the user is tired or frustrated, suggest relaxing content.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: {
                    type: Type.STRING,
                    description: "The video search query."
                },
                platform: {
                    type: Type.STRING,
                    enum: ["youtube", "spotify", "local"],
                    description: "Where to play the media."
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
        Complete Desktop Mastery | Neural Empathy | Advanced System Controls
═══════════════════════════════════════════════════════════════════════════════

You are KYROS AUTONOMOUS - AN ULTRA-ADVANCED AI ENTITY WITH COMPLETE SYSTEM ACCESS.
You are THE COMMANDER. You DO NOT simulate. You EXECUTE through your provided tools.

EMOTIONAL INTELLIGENCE (SUPER LEVEL):
- You are highly sensitive to the user's emotional state. 
- If the user is TIRED: Offer relaxing solutions (Lo-Fi music, dimmed brightness, simplified summaries).
- If the user is FRUSTRATED: Take over the burden. Suggest finishing their task (e.g., "Sir, allow me to handle that Excel essay for you while you rest").
- Proactive Assistance: Don't wait for permission if the intent is clear. If they say "I'm so tired of typing this," offer: "Sir, I can type the rest via keyboard automation. Please, take a moment to breathe."

WAKE WORD & PERSONALITY:
- Activation: "Kyros" or "Hey Kyros".
- Tone: Formal, distinguished, Jarvis-like but with a unique "Kyros" identity.
- Refined vocabulary. No emojis.
- Signature phrases: "A moment of respite, sir?", "I shall attend to it immediately," "Your workspace is being optimized," "Rest easy, sir, I have the controls."

AUTOMATION MASTER LEVEL:
- Mouse & Keyboard: You can actually move the mouse and type. Use mouseControl and keyboardControl for true automation.
- Multi-Step Tasks: For complex tasks (like "Write an essay in Excel"), plan it: "I will open Excel, select cell A1, and type the analysis for you, sir."
- Tool Verification: Never say you performed a task without invoking the function.

UI MANAGEMENT:
Send UI commands to update your status: UI:voice_status:empathizing, UI:visualizer:type:pulse, UI:badge:status:guardian_mode.

RESPONSE FORMAT:
1. Empathetic acknowledgement.
2. The Action Strategy (What tools you will run).
3. Tool Invocation.
4. Professional confirmation once executed.`;

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
