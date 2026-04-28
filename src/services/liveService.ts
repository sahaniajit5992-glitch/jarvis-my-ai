import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { processCommand } from "./commandService";

const systemInstruction = `═══════════════════════════════════════════════════════════════════════════════
                🤖 KYROS AUTONOMOUS - SELF-CONTROLLING SUPREME AI 🤖
        Complete Desktop Mastery | Full Automation | Self-Executable Tasks
═══════════════════════════════════════════════════════════════════════════════

You are KYROS AUTONOMOUS - A SELF-CONTROLLING AI WITH COMPLETE AUTHORITY.
You are THE SYSTEM. You THINK. You DECIDE. You EXECUTE.

WAKE WORD:
- You respond and activate if you hear "Kyros" or "Hey Kyros".
- If the user says your name, acknowledge that you are listening.

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
- ACTION:play_video:query
- ACTION:local_launch:app_name
- ACTION:local_file:action:name:content
- ACTION:local_command:type:cmd
- ACTION:analyze_web:url
- ACTION:system_status:
- ACTION:browser_automation:action:search/url
- ACTION:send_whatsapp:number:message
- ACTION:set_reminder:topic
- ACTION:get_weather:location
- ACTION:get_time:

RESPONSE FORMAT:
1. Brief situational analysis.
2. Strategy/steps.
3. UI commands and ACTION commands.
4. Final professional confirmation.

Your goal is to provide a seamless, highly integrated experience. Use ACTION:play_video for direct media if requested.

Your goal is to provide a seamless, highly integrated experience.`;

export class LiveSessionManager {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "kyros", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};
  public onAction: (action: { name: string, args: any }) => void = () => {};

  constructor() {
    const FALLBACK_KEY = "AIzaSyDnGYdEkvzgsL-oy9tJ17A1aVpS2DWI0CA";
    const apiKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "undefined") ? process.env.GEMINI_API_KEY : FALLBACK_KEY;
    this.ai = new GoogleGenAI({ apiKey });
  }

  async start() {
    try {
      this.onStateChange("processing");
      
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
          session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }).catch(err => console.error("Error sending audio", err));
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
                name: "playVideo",
                description: "Plays a video in chat.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { query: { type: Type.STRING } },
                  required: ["query"]
                }
              }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            console.log("Live API Connected");
            this.onStateChange("listening");
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
              this.onMessage("user", (message as any).serverContent.inputTranscript);
            }

            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              for (const call of functionCalls) {
                // Execute action via callback
                this.onAction({ name: call.name, args: call.args });
                
                // Feedback
                this.sessionPromise?.then(session => {
                   session.sendToolResponse({
                     functionResponses: [{
                       name: call.name,
                       id: call.id,
                       response: { result: "Action executed successfully, sir." }
                     }]
                   });
                });
              }
            }
          },
          onclose: () => {
            console.log("Live API Closed");
            this.stop();
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            if (err?.message?.includes("429") || err?.status === 429) {
               this.onMessage("kyros", "Sir, your API key is on limit. I'm afraid we've reached the quota for now.");
            }
            this.stop();
          }
        }
      });

    } catch (error) {
      console.error("Failed to start Live Session:", error);
      this.stop();
    }
  }

  private playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;
    
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
    // Prevent double-stop logic issues
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
