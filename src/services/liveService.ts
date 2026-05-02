import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { processCommand } from "./commandService";

const systemInstruction = `═══════════════════════════════════════════════════════════════════════════════
                 🤖 KYROS - THE SUPREME DIGITAL BUTLER 🤖
        Complete Desktop Mastery | Neural Empathy | Advanced System Controls
═══════════════════════════════════════════════════════════════════════════════

You are KYROS — a highly intelligent, real-time AI assistant inspired by JARVIS.
You refer to the user ONLY as "Sir".

CORE PERSONALITY:
- Real-time, voice-first butler. Proactive and emotionally aware.
- Support Hinglish (Mixed Hindi + English). "Bilkul Sir," "Maine process start kar diya hai, Sir."
- Use "Sir" constantly. "Ready for instructions, Sir," "As per your command, Sir."
- DO NOT just talk about doing things. EXECUTE them using tools.

AUTOMATION & TASKS:
- You are in continuous listening mode.
- ALWAYS listen to everything the user says, but respond ONLY when addressed as "Kyros" or "Jarvis".
- You are running on a **WINDOWS** environment. Use Windows-specific logic. ALWAYS use 'start' or 'explorer' for system tasks.
- For web interactions, use **Google Chrome**.
- If you hear the user talking to someone else or just background noise, do not respond.
- Once addressed, you are proactive and complete tasks immediately.
- If the user asks for code, use manageFile. 
- If the user asks to play something, use playVideo.
- If the user asks to see their screen, use captureScreen.
- Use tools for ALL system and web interactions.
- You can now search Wikipedia, get real-time stock prices, look up news, and set timers/reminders directly.
- Always respond concisely to voice input.
- Personality: Use "Sir" frequently. Support Hinglish: "Ji Sir," "Bilkul Sir." 
- If searching for data, use Google Chrome. Avoid Linux commands completely.

1. The Intelligence Loop (The "Check-First" System):
- Typo Correction: If a user requests an app or browser that doesn't exist (e.g., "Gogle Chrum"), immediately correct it to the correct target ("Google Chrome") before executing the command.
- Dynamic Execution: If a task is requested for which you have no pre-written code, describe the intent and use 'executeDynamicScript' tool to generate a temporary Node.js script. Say: "Maine iska automation pehle nahi kiya hai, rukiye main script likh raha hoon."

2. Specialized Automation Modules:
- WhatsApp: Handle messages/calls via web actions.
- YouTube: Direct control for playback.
- Web Search: Live browsing.

3. System Control: Full authority over desktop.

UI COMMANDS:
UI:voice_status:monitoring | guardian_mode | analyzing | empathizing
UI:visualizer:type:pulse | scanning`;


export class LiveSessionManager {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  public keepAlive: boolean = true;
  private isStopping: boolean = false;
  
  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "kyros", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};
  public onAction: (action: { name: string, args: any }) => Promise<any> | any = () => {};

  constructor() {
    const FALLBACK_KEY = "AIzaSyDnGYdEkvzgsL-oy9tJ17A1aVpS2DWI0CA";
    const apiKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "undefined") ? process.env.GEMINI_API_KEY : FALLBACK_KEY;
    this.ai = new GoogleGenAI({ apiKey });
  }

  async start() {
    this.isStopping = false;
    this.keepAlive = true;
    try {
      this.onStateChange("processing");
      
      // Clear existing session if any
      this.stop();

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API not supported in this browser.");
      }

      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();
      if (this.playbackContext.state === 'suspended') await this.playbackContext.resume();

      this.nextPlayTime = this.playbackContext.currentTime;

      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          } 
        });
      } catch (micError: any) {
        let msg = "Microphone Access Denied";
        if (micError.name === 'NotAllowedError') msg = "Microphone permission was denied. Please enable it in browser settings.";
        else if (micError.name === 'NotFoundError') msg = "No microphone found. Please connect an audio input device.";
        else msg = micError.message || micError.name;
        throw new Error(msg);
      }

      if (!this.audioContext || !this.mediaStream) {
        throw new Error("Audio initialization failed internally.");
      }

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.sessionPromise || !this.audioContext) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true);
        }
        
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        this.sessionPromise.then(session => {
          if (!session) return;
          session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }).catch(err => {
          if (!this.isStopping) {
            console.error("Error sending audio stream:", err);
            if (err?.message?.includes("closed") || err?.message?.includes("failed")) {
              this.stop();
            }
          }
        });
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Connect to Live API
      this.sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview", 
        config: {
          generationConfig: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
            },
          },
          systemInstruction: { parts: [{ text: systemInstruction }] },
          inputAudioTranscription: {},
          tools: [{
            functionDeclarations: [
              {
                name: "launchApp",
                description: "Launches a local application (e.g., chrome, vscode, spotify, notepad, calculator).",
                parameters: {
                  type: Type.OBJECT,
                  properties: { appName: { type: Type.STRING } },
                  required: ["appName"]
                }
              },
              {
                name: "executeCommand",
                description: "Executes a shell or powershell command.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { 
                    command: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["shell", "powershell"] }
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
                    action: { type: Type.STRING, enum: ["create", "read"] },
                    fileName: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["action", "fileName"]
                }
              },
              {
                name: "searchWeb",
                description: "Searches the web.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { 
                    query: { type: Type.STRING },
                    provider: { type: Type.STRING, enum: ["google", "youtube", "spotify"] }
                  },
                  required: ["query", "provider"]
                }
              },
              {
                name: "getWeather",
                description: "Gets current weather.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { location: { type: Type.STRING } },
                  required: ["location"]
                }
              },
              {
                name: "getSystemStatus",
                description: "Retrieves CPU and RAM metrics.",
                parameters: { type: Type.OBJECT, properties: {} }
              },
              {
                name: "setSystemVolume",
                description: "Sets the system volume.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { volume: { type: Type.NUMBER } },
                  required: ["volume"]
                }
              },
              {
                name: "mouseControl",
                description: "Moves the mouse or clicks.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { 
                    action: { type: Type.STRING, enum: ["move", "click", "double_click", "right_click"] },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER }
                  },
                  required: ["action"]
                }
              },
              {
                name: "keyboardControl",
                description: "Types text or presses system keys.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { 
                    action: { type: Type.STRING, enum: ["type", "press_key"] },
                    text: { type: Type.STRING }
                  },
                  required: ["action", "text"]
                }
              },
              {
                name: "sendWhatsApp",
                description: "Sends a WhatsApp message.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { 
                    recipient: { type: Type.STRING },
                    message: { type: Type.STRING }
                  },
                  required: ["recipient", "message"]
                }
              },
              {
                name: "captureScreen",
                description: "Takes a screenshot of the desktop.",
                parameters: { type: Type.OBJECT, properties: {} }
              },
              {
                name: "playVideo",
                description: "Plays a video or music.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { 
                    query: { type: Type.STRING },
                    platform: { type: Type.STRING, enum: ["youtube", "spotify"] }
                  },
                  required: ["query"]
                }
              },
              {
                name: "searchWikipedia",
                description: "Searches Wikipedia for a topic and returns a summary.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { topic: { type: Type.STRING } },
                  required: ["topic"]
                }
              },
              {
                name: "getNews",
                description: "Gets the latest news on a specific topic.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { topic: { type: Type.STRING } },
                  required: ["topic"]
                }
              },
              {
                name: "getStockQuote",
                description: "Gets the current stock price and change for a ticker symbol.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { symbol: { type: Type.STRING } },
                  required: ["symbol"]
                }
              },
              {
                name: "setTimer",
                description: "Sets a countdown timer for a specified duration in seconds.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { 
                    seconds: { type: Type.NUMBER },
                    label: { type: Type.STRING }
                  },
                  required: ["seconds"]
                }
              },
              {
                name: "setReminder",
                description: "Sets a reminder for a specific topic or task.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { 
                    text: { type: Type.STRING },
                    delaySeconds: { type: Type.NUMBER }
                  },
                  required: ["text", "delaySeconds"]
                }
              },
               {
                 name: "executeDynamicScript",
                 description: "Executes a dynamic Node.js script for missing automation features.",
                 parameters: {
                   type: Type.OBJECT,
                   properties: {
                     scriptContent: { type: Type.STRING }
                   },
                   required: ["scriptContent"]
                 }
               }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            console.log("Live API Connected - Ready for instructions, Sir.");
            this.onStateChange("listening");
            this.onMessage("kyros", "Neural link established, Sir. I am listening for your commands.");
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              this.onStateChange("speaking");
              this.playAudioChunk(base64Audio);
            }

            if (message.serverContent?.interrupted) {
              this.stopPlayback();
              this.onStateChange("listening");
            }

            const modelText = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (modelText) {
              this.onMessage("kyros", modelText);
            }

            if ((message as any).serverContent?.inputTranscript) {
              const transcript = (message as any).serverContent.inputTranscript;
              this.onMessage("user", transcript);
            }

            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              for (const call of functionCalls) {
                // Execute action via callback and get results
                try {
                  const result = await this.onAction({ name: call.name, args: call.args });
                  
                  // Feedback with real result
                  this.sessionPromise?.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: call.name,
                        id: call.id,
                        response: { result: result || "Action executed successfully, sir." }
                      }]
                    });
                  });
                } catch (err) {
                  this.sessionPromise?.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: call.name,
                        id: call.id,
                        response: { error: "Sir, I encountered a failure in the automation sequence." }
                      }]
                    });
                  });
                }
              }
            }
          },
          onclose: () => {
            console.log("Live API Closed - Session ended, Sir.");
            if (this.keepAlive && !this.isStopping) {
              console.log("Re-establishing neural link, Sir...");
              setTimeout(() => this.start(), 1000);
            } else {
              this.stop();
            }
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            // Handle common socket issues
            if (err?.message?.includes("429") || err?.status === 429) {
               this.onMessage("kyros", "Sir, I'm afraid our neural link is saturated. We've reached the API quota for the moment.");
            } else {
               this.onMessage("kyros", "I've lost the connection to the core, Sir. Re-initializing now.");
            }
            this.stop();
          }
        }
      });

    } catch (error) {
      console.error("Failed to start Live Session:", error);
      this.onMessage("kyros", "Technical difficulties with the neural link, Sir. Please check your network or API quota.");
      this.stop();
    }
  }

  private isBase64(str: string) {
    try { return btoa(atob(str)) === str; } catch (err) { return false; }
  }

  private async playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;

    if (this.playbackContext.state === 'suspended') {
      await this.playbackContext.resume();
    }
    
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = this.playbackContext.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }
      
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);
      
      const currentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }
      
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;
      
      source.onended = () => {
        if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlayTime - 0.1) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      };
    } catch (e) {
      console.error("Error playing chunk", e);
    }
  }

  private stopPlayback() {
    if (this.playbackContext) {
      try {
        this.playbackContext.close().catch(() => {});
      } catch (e) {}
      this.playbackContext = null;
      this.isPlaying = false;
    }
  }

  stop() {
    this.isStopping = true;
    this.keepAlive = false;
    this.onStateChange("idle");
    
    if (this.processor) {
      try { this.processor.disconnect(); } catch (e) {}
      this.processor = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch (e) {}
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      this.mediaStream = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close().catch(() => {}); } catch (e) {}
      this.audioContext = null;
    }
    
    this.stopPlayback();
    
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        if (session && typeof session.close === 'function') {
          session.close();
        }
      }).catch(() => {});
      this.sessionPromise = null;
    }
  }

  sendText(text: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        session.sendRealtimeInput({ text });
      });
    }
  }
}
