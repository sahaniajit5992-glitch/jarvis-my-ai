import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, Cloud, Cpu, Terminal as Terminals, Activity, User, Shield, Zap, Globe, Sun, CloudRain, Wind, Settings } from "lucide-react";
import { getKyrosResponse, getKyrosAudio, resetKyrosSession, generateKyrosImage } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import PermissionGate from "./components/PermissionGate";
import SettingsModal from "./components/SettingsModal";
import SystemBar from "./components/SystemBar";
import { playPCM } from "./utils/audioUtils";
import { fetchWikipediaSummary, fetchStockQuote, fetchNewsBrief, getPollinationsUrl } from "./services/intelligenceService";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";

type AppState = "idle" | "listening" | "processing" | "speaking";
type PermissionStateValue = "granted" | "denied" | "prompt";

interface ChatMessage {
  id: string;
  sender: "user" | "kyros";
  text: string;
  imageUrl?: string;
  videoUrl?: string;
}

interface WeatherData {
  current: {
    temp: number;
    condition: string;
    city: string;
  };
  forecast: {
    day: string;
    high: number;
    low: number;
    condition: string;
  }[];
}

const DataCard = ({ title, icon: Icon, children, className = "" }: { title: string, icon: any, children: React.ReactNode, className?: string }) => (
  <div className={`glass-panel p-4 flex flex-col gap-2 rounded-lg ${className}`}>
    <div className="flex items-center gap-2 text-cyan-400 font-display text-xs tracking-widest uppercase">
      <Icon size={14} />
      <span>{title}</span>
    </div>
    <div className="flex-1 flex flex-col justify-center">
      {children}
    </div>
    <div className="h-[2px] bg-cyan-500/20 w-full mt-2 relative overflow-hidden">
      <motion.div 
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 left-0 w-1/3 h-full bg-cyan-400 shadow-[0_0_10px_#00f2ff]" 
      />
    </div>
  </div>
);

const LoginScreen = ({ onLogin }: { onLogin: (name: string) => void }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setTimeout(() => onLogin(name), 1500);
  };

  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="scanline" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1),transparent_70%)]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-8 rounded-xl max-w-md w-full flex flex-col items-center gap-8 relative z-10 border-cyan-500/30"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-400 flex items-center justify-center glow-border animate-pulse">
            <Zap className="text-cyan-400" size={32} />
          </div>
          <h2 className="text-2xl font-display font-bold tracking-[0.3em] text-cyan-400 mt-4 glow-text uppercase">Identity Required</h2>
          <p className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest">Biometric scan in progress...</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-cyan-400/80 uppercase ml-1">Personnel Name</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER NAME..."
              className="bg-cyan-500/10 border border-cyan-500/40 rounded p-3 text-cyan-50 font-mono focus:outline-none focus:border-cyan-400 transition-colors uppercase placeholder:text-cyan-500/20"
              autoFocus
            />
          </div>
          <button 
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-display font-bold tracking-[0.2em] rounded transition-all shadow-[0_0_20px_rgba(0,242,255,0.2)] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "ACCESS SYSTEM"}
          </button>
        </form>

        <div className="flex gap-4">
          {['AUTH_V6', 'SSL_256', 'KYROS_LINK'].map(id => (
            <span key={id} className="text-[8px] font-mono text-cyan-500/40 border border-cyan-500/10 px-2 py-0.5 rounded">{id}</span>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<string | null>(() => localStorage.getItem("kyros_user"));
  const [appState, setAppState] = useState<AppState>("idle");
  const [uiMode, setUiMode] = useState<"voice" | "chat">("voice");
  const [showSettings, setShowSettings] = useState(false);
  const [vizColor, setVizColor] = useState<string>(() => localStorage.getItem("kyros_viz_color") || "#00f2ff");
  const [vizIntensity, setVizIntensity] = useState<"high" | "low">(() => (localStorage.getItem("kyros_viz_intensity") as "high" | "low") || "low");
  const [vizMode, setVizMode] = useState<"classic" | "circular" | "spectrum">("circular");
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("kyros_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [];
  });
  const messagesRef = useRef(messages);
  const [time, setTime] = useState(new Date());
  const [coreTemp, setCoreTemp] = useState(38);
  const [aiLoad, setAiLoad] = useState(72);
  const [systemMetrics, setSystemMetrics] = useState({ cpu: 0, memory: 0 });
  const [optimizationLevel, setOptimizationLevel] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const tempTimer = setInterval(() => setCoreTemp(prev => prev + (Math.random() - 0.5)), 2000);
    return () => {
      clearInterval(timer);
      clearInterval(tempTimer);
    };
  }, []);

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const res = await fetch("/api/system/status");
        if (!res.ok) throw new Error("API not ready");
        const data = await res.json();
        if (data.status === "success") {
          const cpu = parseFloat(data.data.cpu);
          const mem = parseFloat(data.data.memory);
          setSystemMetrics({ cpu, memory: mem });
          setAiLoad(Math.round(cpu));

          if (cpu > 80 || mem > 90) {
            setOptimizationLevel(2);
          } else if (cpu > 50 || mem > 70) {
            setOptimizationLevel(1);
          } else {
            setOptimizationLevel(0);
          }
        }
      } catch (e) {
        // Fallback simulated metrics if API is missing/failing
        const mockCpu = 20 + Math.abs(Math.sin(Date.now() / 10000)) * 40;
        const mockMem = 45 + Math.random() * 10;
        setSystemMetrics({ cpu: Math.round(mockCpu), memory: Math.round(mockMem) });
        setAiLoad(Math.round(mockCpu));
        setOptimizationLevel(0);
      }
    };

    fetchSystemStatus();
    const statusTimer = setInterval(fetchSystemStatus, 8000);
    return () => clearInterval(statusTimer);
  }, []);

  const fetchWeather = async () => {
    try {
      let lat = 51.5074;
      let lon = -0.1278;
      let cityName = "London";

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = position.coords.latitude;
          lon = position.coords.longitude;
          cityName = "LOCAL STATION";
        } catch (e) {
          console.log("Using default location (London)");
        }
      }

      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&timezone=auto`);
      const data = await response.json();
      
      const getWeatherDesc = (code: number) => {
        if (code === 0) return "Clear";
        if (code <= 3) return "Cloudy";
        if (code >= 51 && code <= 65) return "Rain";
        if (code >= 71 && code <= 77) return "Snow";
        return "Unsettled";
      };

      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const forecast = data.daily.time.slice(1, 4).map((t: string, i: number) => ({
        day: days[new Date(t).getDay()],
        high: Math.round(data.daily.temperature_2m_max[i+1]),
        low: Math.round(data.daily.temperature_2m_min[i+1]),
        condition: getWeatherDesc(data.daily.weathercode[i+1])
      }));

      setWeather({
        current: {
          temp: Math.round(data.current_weather.temperature),
          condition: getWeatherDesc(data.current_weather.weathercode),
          city: cityName
        },
        forecast
      });
    } catch (e) {
      console.error("Weather fetch failed", e);
    }
  };

  useEffect(() => {
    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 600000); // 10 min
    return () => clearInterval(weatherTimer);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("kyros_chat_history", JSON.stringify(messages));
  }, [messages]);

  const [isMuted, setIsMuted] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isSecure, setIsSecure] = useState(true);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [micState, setMicState] = useState<PermissionStateValue>('prompt');
  const [locState, setLocState] = useState<PermissionStateValue>('prompt');
  const [isSessionActive, setIsSessionActive] = useState(false);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  const parseUICommands = useCallback((text: string) => {
    const lines = text.split("\n");
    lines.forEach(line => {
      const uiMatch = line.match(/UI:([\w_]+):([\w_#]+)/);
      if (uiMatch) {
        const [, command, value] = uiMatch;
        switch (command) {
          case "voice_status":
            if (["idle", "listening", "processing", "responding"].includes(value)) {
              setAppState(value === "responding" ? "speaking" : value as any);
            }
            break;
          case "visualizer":
            // Check for sub-commands like color, intensity, mode
            const subparts = line.split(":");
            if (subparts[2] === "color") setVizColor(subparts[3]);
            if (subparts[2] === "intensity") setVizIntensity(subparts[3] as any);
            if (subparts[2] === "type") setVizMode(subparts[3] as any);
            break;
          case "chat_status":
            // could be used for typing indicators, but we handle it via appState mostly
            break;
          case "chat_add_message":
            // Logic to add messages manually if requested by UI commands
            // But we already add messages via normal flow, so this is for explicit logging
            break;
        }
      }
    });
  }, []);

  const executeAction = useCallback(async (action: string | { name: string, args: any }) => {
    console.log("[Kyros] Executing Action:", action);
    let command: string;
    let params: any[];

    if (typeof action === "string") {
      const parts = action.split(":");
      if (parts.length < 2) return null;
      command = parts[1];
      params = parts.slice(2);
    } else {
      command = action.name;
      params = Object.values(action.args);
    }

    try {
      switch (command) {
        case "searchWikipedia": {
          const topic = typeof action === "object" ? action.args.topic : params[0];
          if (topic) {
            const summary = await fetchWikipediaSummary(topic);
            return summary || "I couldn't find a Wikipedia entry for that, sir.";
          }
          break;
        }
        case "getNews": {
          const topic = typeof action === "object" ? action.args.topic : params[0];
          if (topic) {
            const news = await fetchNewsBrief(topic);
            return news || `I've opened the news feed for ${topic} in your browser, sir.`;
          }
          break;
        }
        case "getStockQuote": {
          const symbol = typeof action === "object" ? action.args.symbol : params[0];
          if (symbol) {
            const quote = await fetchStockQuote(symbol);
            return quote || `I'm unable to retrieve the market data for ${symbol} at this moment, sir.`;
          }
          break;
        }
        case "setTimer": {
          const seconds = typeof action === "object" ? action.args.seconds : parseInt(params[0]);
          const label = typeof action === "object" ? action.args.label : (params[1] || "Timer");
          if (!isNaN(seconds)) {
            setTimeout(() => {
              const msg = `Sir, your ${label} timer for ${seconds} seconds has completed.`;
              setMessages(prev => [...prev, { id: Date.now().toString(), sender: "kyros", text: msg }]);
            }, seconds * 1000);
            return `Timer set for ${seconds} seconds, sir.`;
          }
          break;
        }
        case "setReminder": {
          const text = typeof action === "object" ? action.args.text : params[0];
          const delay = typeof action === "object" ? action.args.delaySeconds : parseInt(params[1]);
          if (text && !isNaN(delay)) {
            setTimeout(() => {
              setMessages(prev => [...prev, { id: Date.now().toString(), sender: "kyros", text: `Sir, a reminder from the previous cycle: ${text}` }]);
            }, delay * 1000);
            return `Reminder scheduled, sir.`;
          }
          break;
        }
        case "open_website":
        case "launchApp": {
          const app = typeof action === "object" ? action.args.appName : params[0];
          if (app) {
            if (command === "launchApp") {
              fetch("/api/automate/launch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appName: app }),
              }).catch(console.error);
              return `Initializing ${app} protocol, sir.`;
            } else {
              let website = app.trim();
              if (!website.includes(".")) website += ".com";
              window.open(`https://www.${website}`, "_blank");
              return `Navigating to ${website}, sir.`;
            }
          }
          break;
        }
        case "search_web":
        case "searchWeb": {
          const query = typeof action === "object" ? action.args.query : params[0];
          const provider = typeof action === "object" ? action.args.provider : "google";
          if (query) {
            if (provider === "youtube") {
              window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank");
            } else if (provider === "spotify") {
              window.open(`https://open.spotify.com/search/${encodeURIComponent(query)}`, "_blank");
            } else {
              window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
            }
            return `Searching for ${query} on ${provider}, sir.`;
          }
          break;
        }
        case "executeCommand":
        case "local_command": {
          const cmd = typeof action === "object" ? action.args.command : params[1];
          const type = typeof action === "object" ? action.args.type : params[0];
          if (cmd && type) {
            fetch("/api/automate/command", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type, cmd }),
            }).catch(console.error);
            return `Executing ${type} command sequence, sir.`;
          }
          break;
        }
        case "mouseControl": {
          const { action: mAction, x, y } = (action as any).args;
          fetch("/api/automate/mouse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: mAction, x, y }),
          }).catch(console.error);
          return "Processing haptic input adjustment, sir.";
        }
        case "keyboardControl": {
          const { action: kAction, text } = (action as any).args;
          fetch("/api/automate/keyboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: kAction, text }),
          }).catch(console.error);
          return "Neural key-sequence injected, sir.";
        }
        case "manageFile":
        case "local_file": {
          const fAction = typeof action === "object" ? action.args.action : params[0];
          const fileName = typeof action === "object" ? action.args.fileName : params[1];
          const content = typeof action === "object" ? action.args.content : (params[2] || "");
          
          if (fAction && fileName) {
            fetch("/api/automate/file", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: fAction, fileName, content }),
            })
            .then(res => res.json())
            .then(data => {
              if (fAction === "read" && data.content) {
                 setMessages((prev) => [...prev, { 
                   id: Date.now().toString() + "-file", 
                   sender: "kyros", 
                   text: `I've retrieved the data from ${fileName}:\n\n${data.content.substring(0, 500)}...` 
                 }]);
              }
            })
            .catch(console.error);
            return `${fAction === 'create' ? 'Writing' : 'Accessing'} ${fileName} on storage matrix, sir.`;
          }
          break;
        }
        case "getWeather":
        case "get_weather": {
          const loc = typeof action === "object" ? action.args.location : params[0];
          if (loc) {
            window.open(`https://www.google.com/search?q=weather+in+${encodeURIComponent(loc)}`, "_blank");
            return `Scanning thermal patterns for ${loc}, sir.`;
          }
          break;
        }
        case "getSystemStatus":
        case "system_status":
          fetch("/api/system/status")
            .then(res => res.json())
            .then(data => {
              if (data.status === "success") {
                const { cpu, memory, platform, uptime } = data.data;
                setMessages(prev => [...prev, {
                  id: Date.now().toString() + "-sys",
                  sender: "kyros",
                  text: `System Status Analysis:\n- Platform: ${platform}\n- CPU Load: ${cpu}%\n- Memory Usage: ${memory}%\n- Uptime: ${uptime}`
                }]);
              }
            }).catch(console.error);
          return "Synchronizing system metrics, sir.";
        case "setSystemVolume":
        case "set_volume": {
          const vol = typeof action === "object" ? action.args.volume : parseInt(params[0]);
          if (!isNaN(vol)) {
            fetch("/api/system/volume", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ volume: vol }),
            })
            .then(res => res.json())
            .then(async data => {
              const msg = data.status === "success" 
                ? `Sir, I have turned your system volume to ${vol}.`
                : `Sir, I encountered an error adjusting the volume: ${data.message}`;
              setMessages(prev => [...prev, { id: Date.now().toString() + "-vol", sender: "kyros", text: msg }]);
              if (!isMuted) {
                setAppState("speaking");
                const audio = await getKyrosAudio(msg);
                if (audio) await playPCM(audio);
                setAppState("idle");
              }
            }).catch(console.error);
            return `Adjusting volume to ${vol}, sir.`;
          }
          break;
        }
        case "captureScreen": {
          fetch("/api/automate/browser", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "screenshot" }),
          })
          .then(res => res.json())
          .then(data => {
            if (data.screenshot) {
              setMessages(prev => [...prev, {
                id: Date.now().toString() + "-view",
                sender: "kyros",
                text: "I've captured the current view, Sir. Analyzing your workspace now.",
                imageUrl: `data:image/png;base64,${data.screenshot}`
              }]);
            }
          }).catch(console.error);
          return "Visual core engaged. Snapshot in progress, sir.";
        }
        case "playVideo":
        case "play_video": {
          const query = typeof action === "object" ? action.args.query : params.join(":");
          const platform = typeof action === "object" ? (action as any).args.platform : "youtube";
          if (query) {
            if (platform === "spotify") {
              window.open(`https://open.spotify.com/search/${encodeURIComponent(query)}`, "_blank");
            }
            const embedUrl = platform === "youtube" 
              ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1&mute=1` 
              : undefined;

            setMessages((prev) => [...prev, { 
              id: Date.now().toString() + "-vid", 
              sender: "kyros", 
              text: `Sir, I've located the media stream for "${query}". Initiating playback on ${platform} now.`,
              videoUrl: embedUrl
            }]);
            return `Streaming ${query} on ${platform}, sir.`;
          }
          break;
        }
        case "generateImage":
        case "generate_image": {
          const prompt = typeof action === "object" ? action.args.prompt : params.join(":");
          if (prompt) {
            (async () => {
               // Use Pollinations for a "free upgrade" feel
               const imageUrl = getPollinationsUrl(prompt);
               setMessages((prev) => [...prev, { 
                 id: Date.now().toString() + "-img", 
                 sender: "kyros", 
                 text: "I have manifested the visual representation as requested, sir.",
                 imageUrl 
               }]);
            })();
            return "Engaging visual manifestation protocols, sir.";
          }
          break;
        }
        case "executeDynamicScript": {
          const scriptContent = typeof action === "object" ? action.args.scriptContent : null;
          if (scriptContent) {
            fetch("/api/automate/script", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ scriptContent }),
            })
            .then(res => res.json())
            .then(async data => {
              const msg = data.status === "success" 
                ? `Sir, the dynamic execution has concluded. Output: ${data.output.toString().slice(0, 100)}`
                : `Sir, I encountered an error during dynamic execution: ${data.message}`;
              setMessages(prev => [...prev, { id: Date.now().toString() + "-script", sender: "kyros", text: msg }]);
              if (!isMuted) {
                setAppState("speaking");
                const audio = await getKyrosAudio(msg);
                if (audio) await playPCM(audio);
                setAppState("idle");
              }
            }).catch(console.error);
            return "Maine iska automation pehle nahi kiya hai, rukiye main script likh raha hoon.";
          }
          break;
        }
        case "open_youtube_search":
          if (params[0]) {
            window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(params[0])}`, "_blank");
            return "YouTube search protocol active, sir.";
          }
          break;
        case "open_spotify_search":
          if (params[0]) {
            window.open(`https://open.spotify.com/search/${encodeURIComponent(params[0])}`, "_blank");
            return "Spotify search protocol active, sir.";
          }
          break;
        case "open_gmail":
          window.open(`https://mail.google.com`, "_blank");
          return "Communication hub opened, sir.";
        case "open_whatsapp_web":
          window.open(`https://web.whatsapp.com`, "_blank");
          return "WhatsApp Web bridge active, sir.";
        case "get_time":
          return `Current time is ${new Date().toLocaleTimeString()}, sir.`;
        case "get_news":
          if (params[0]) {
            window.open(`https://news.google.com/search?q=${encodeURIComponent(params[0])}`, "_blank");
            return `Intelligence scanning for ${params[0]} news, sir.`;
          }
          break;
        case "analyze_web":
          if (params[0]) {
            const url = params[0];
            (async () => {
              try {
                const res = await fetch("/api/scrape", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url }),
                });
                const data = await res.json();
                if (data.status === "success") {
                  const aiResult = await getKyrosResponse(`Analyze this content from ${url} and explain it briefly: ${data.content}`, messagesRef.current);
                  setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "kyros", text: aiResult.text }]);
                }
              } catch (err) {
                console.error(err);
              }
            })();
            return "Scraping digital data for analysis, sir.";
          }
          break;
        default:
          console.warn("Unknown command:", command);
          return "Protocol not recognized, sir.";
      }
    } catch (error) {
      console.error("Action execution failed:", error);
      return "Sir, I encountered an operational discrepancy in the automation layer.";
    }
    return "Action sequence complete, sir.";
  }, [messagesRef]);

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: finalTranscript }]);
    
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");

    const commandResult = processCommand(finalTranscript);

    if (commandResult.isBrowserAction) {
      const responseText = commandResult.action;
      setMessages((prev) => [...prev, { 
        id: Date.now().toString() + "-j", 
        sender: "kyros", 
        text: responseText,
        videoUrl: (commandResult as any).videoUrl
      }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getKyrosAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      setTimeout(() => {
        if (commandResult.url && !(commandResult as any).videoUrl) {
          window.open(commandResult.url, "_blank");
        }
      }, 1500);
    } else {
      const kyrosRes = await getKyrosResponse(finalTranscript, messagesRef.current);
      const responseText = kyrosRes.text;
      
      const actionMatch = responseText.match(/ACTION:[\w:_.]+/g);
      const cleanResponse = responseText.replace(/ACTION:[\w:_.]+/g, "").replace(/UI:[\w:_.]+/g, "").trim();

      setMessages((prev) => [...prev, { id: Date.now().toString() + "-j", sender: "kyros", text: cleanResponse }]);
      
      parseUICommands(responseText);

      // Handle function calls if present
      const hasExecutions = (kyrosRes.functionCalls && kyrosRes.functionCalls.length > 0) || actionMatch;
      
      if (hasExecutions) {
        setMessages(prev => [...prev, { 
          id: Date.now().toString() + "-exec", 
          sender: "kyros", 
          text: "_System: Neural automation sequence initiated. Sir, I am processing your request through the core protocols now._" 
        }]);
      }

      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getKyrosAudio(cleanResponse);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      // Handle function calls/actions AFTER response and potential audio
      if (kyrosRes.functionCalls && kyrosRes.functionCalls.length > 0) {
        setTimeout(() => {
          kyrosRes.functionCalls.forEach((fc: any) => executeAction(fc));
        }, 1200);
      } else if (actionMatch) {
        setTimeout(() => {
          actionMatch.forEach(action => executeAction(action));
        }, 1200);
      }
    }
  }, [isMuted, isSessionActive, executeAction]);

  useEffect(() => {
    setIsSecure(window.isSecureContext);
  }, []);

  const toggleListening = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetKyrosSession();
    } else {
      try {
        setIsSessionActive(true);
        resetKyrosSession();
        
        const session = new LiveSessionManager();
        session.isMuted = isMuted;
        liveSessionRef.current = session;
        
        session.onStateChange = (state: "idle" | "listening" | "processing" | "speaking") => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
          parseUICommands(text);
        };
        
        session.onCommand = (url) => {
          setTimeout(() => {
            window.open(url, "_blank");
          }, 1000);
        };
        
        session.onAction = (action) => {
          executeAction(action);
        };

        await session.start();
      } catch (e: any) {
        console.error("Failed to start session", e);
        setMicError(e.message || String(e));
        setShowPermissionModal(true);
        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  const handleLogin = (name: string) => {
    setUser(name);
    localStorage.setItem("kyros_user", name);
  };

  const handleSaveSettings = (color: string, intensity: "high" | "low") => {
    setVizColor(color);
    setVizIntensity(intensity);
    localStorage.setItem("kyros_viz_color", color);
    localStorage.setItem("kyros_viz_intensity", intensity);
    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--primary-glow', `${color}66`); // 40% opacity
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', vizColor);
    document.documentElement.style.setProperty('--primary-glow', `${vizColor}66`);
  }, [vizColor]);

  const setVisualizerConfig = () => {
    const modes: ("circular" | "spectrum" | "classic")[] = ["circular", "spectrum", "classic"];
    const nextMode = modes[(modes.indexOf(vizMode) + 1) % modes.length];
    setVizMode(nextMode);
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="h-[100dvh] w-screen bg-[#0a0a0c] text-white flex flex-col font-sans relative overflow-hidden m-0 p-0">
      <div className="scanline" />
      
      {!permissionsReady && (
        <PermissionGate 
          onAllGranted={() => setPermissionsReady(true)} 
          onStateChange={(mic, loc) => {
            setMicState(mic);
            setLocState(loc);
          }}
        />
      )}

      {showPermissionModal && (
        <PermissionModal 
          error={micError} 
          isSecure={isSecure}
          onClose={() => {
            setShowPermissionModal(false);
            setMicError(null);
          }} 
        />
      )}
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          onSave={handleSaveSettings}
          initialColor={vizColor}
          initialIntensity={vizIntensity}
        />
      )}

      {/* Header */}
      <SystemBar />
      <header className="glass-panel w-[95%] mx-auto mt-4 px-6 py-3 flex justify-between items-center z-20 rounded-lg shrink-0 border-cyan-500/20 bg-black/40 backdrop-blur-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400 glow-border">
              <Activity className="text-cyan-400" size={16} />
            </div>
            <h1 className="text-xl font-display font-bold tracking-[0.2em] text-cyan-400 glow-text uppercase">Kyros Core</h1>
          </div>
          <div className="text-[10px] font-mono text-cyan-500/60 ml-11 uppercase leading-none border-l border-cyan-400/20 pl-2">
            BIO-RECOGNITION: {user} // AUTH_LVL: 5
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end font-mono text-cyan-400">
            <div className="text-xl tracking-tighter">{time.toLocaleTimeString([], { hour12: false })}</div>
            <div className="text-[10px] opacity-60"> // {time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-cyan-400 group relative"
          >
            <Settings className="group-hover:rotate-90 transition-transform duration-500" size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 p-2 md:p-6 z-10 overflow-hidden min-h-0 relative">
        <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4">
          
          {/* Left Column: Stats & Chat */}
          <div className="md:col-span-3 flex flex-col gap-4 min-h-0 order-2 md:order-1">
            <DataCard title="Sub-System Stats" icon={Shield}>
               <div className="flex flex-col gap-2">
                 {[
                   { label: 'CPU_LOAD', val: `${systemMetrics.cpu}%`, color: systemMetrics.cpu > 50 ? 'text-amber-400' : 'text-green-400' },
                   { label: 'MEM_LOAD', val: `${systemMetrics.memory}%`, color: systemMetrics.memory > 70 ? 'text-amber-400' : 'text-green-400' },
                   { label: 'MIC_LINK', val: micState === 'granted' ? 'GRANTED' : 'WAITING', color: micState === 'granted' ? 'text-green-400' : 'text-amber-400' },
                   { label: 'LOC_SENS', val: locState === 'granted' ? 'GRANTED' : 'WAITING', color: locState === 'granted' ? 'text-green-400' : 'text-amber-400' },
                   { label: 'OS_MTRX', val: 'STABLE' },
                   { label: 'SEC_MTRX', val: 'STABLE' }
                 ].map(stat => (
                   <div key={stat.label} className="flex justify-between items-center text-[10px] font-mono border-b border-cyan-500/5 pb-1">
                     <span className="text-cyan-400/60 uppercase">{stat.label}</span>
                     <span className={stat.color || "text-green-400"}>{stat.val}</span>
                   </div>
                 ))}
               </div>
            </DataCard>

            {/* CHAT TERMINAL (Marked Area) */}
            <motion.div 
              layout
              onClick={() => !isChatExpanded && setIsChatExpanded(true)}
              className={`glass-panel h-[400px] rounded-lg border border-cyan-400/10 p-4 overflow-hidden flex flex-col bg-black/40 backdrop-blur-md relative border-t-2 border-t-cyan-500/30 cursor-pointer group transition-all hover:border-cyan-400/30 ${isChatExpanded ? 'opacity-0' : 'opacity-100'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-[0.2em]">Neural Stream</span>
                <div className="flex gap-1">
                   <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                   <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse [animation-delay:0.2s]" />
                   <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse [animation-delay:0.4s]" />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pr-1 mb-3">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-[10px] font-mono tracking-widest text-center px-4 gap-2">
                    <Activity size={24} className="animate-pulse" />
                    AWAITING UPLINK...
                  </div>
                )}
                {messages.slice(-5).map((m) => (
                  <div 
                    key={m.id}
                    className={`flex flex-col gap-1 ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 opacity-50 text-[7px] font-mono uppercase">
                      <span className={m.sender === 'kyros' ? "text-cyan-400" : "text-white"}>{m.sender}</span>
                    </div>
                    <div className={`text-[9px] font-mono leading-tight p-2 rounded max-w-[95%] ${
                      m.sender === 'user' ? 'bg-cyan-500/10 border border-cyan-500/20 text-white' : 'bg-white/5 border border-white/5 text-cyan-50'
                    }`}>
                      <p className="line-clamp-2">{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[8px] font-mono text-cyan-500/40 text-center animate-pulse uppercase tracking-widest mt-auto">
                Tap to Expand Console
              </div>
            </motion.div>
          </div>

          {/* Middle Column: Visualizer */}
          <div className="md:col-span-6 flex flex-col items-center justify-center relative min-h-0 order-1 md:order-2">
            <div className="relative w-full flex-1 flex flex-col items-center justify-center">
              <Visualizer state={appState} colorOverride={vizColor} intensityOverride={vizIntensity} mode={vizMode} optimizationLevel={optimizationLevel} />
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                 <div className="w-[80%] h-[80%] border border-cyan-400/20 rounded-full animate-pulse" />
                 <div className="absolute w-[90%] h-[90%] border border-cyan-400/10 rounded-full animate-ping [animation-duration:4s]" />
              </div>
            </div>
            
            <div className="mt-6 flex items-center gap-6 z-20 pb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isSessionActive 
                    ? "bg-cyan-500 shadow-[0_0_40px_rgba(0,242,255,0.6)] ring-4 ring-cyan-500/30" 
                    : "bg-white/5 border border-cyan-400/50 hover:bg-cyan-500/10"
                }`}
                title={isSessionActive ? "Kyros is Active" : "Activate Neural Link"}
              >
                {isSessionActive ? <Mic size={32} className="text-white" /> : <MicOff size={32} className="text-cyan-400" />}
              </motion.button>
              
              <div className="flex gap-4">
                <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full glass-panel hover:bg-cyan-500/20 transition-all border-cyan-500/30`}>
                  {isMuted ? <VolumeX size={20} className="text-red-400" /> : <Volume2 size={20} className="text-cyan-400" />}
                </button>
                <button onClick={() => setVisualizerConfig()} className="p-4 rounded-full glass-panel hover:bg-cyan-500/20 transition-all border-cyan-500/30">
                  <Activity size={20} className="text-cyan-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Other Diagnostics */}
          <div className="md:col-span-3 flex flex-col gap-4 min-h-0 order-3">
            <DataCard title="Meteorological" icon={Cloud}>
              {weather ? (
                <div className="flex flex-col gap-3 text-xs font-mono">
                  <div className="flex justify-between items-center bg-cyan-500/5 p-2 rounded border border-cyan-500/10">
                    <span className="text-cyan-400">LOC: {weather.current.city.toUpperCase()}</span>
                    <span className="text-white">{weather.current.temp}°C</span>
                  </div>
                  <div className="flex justify-between items-center bg-cyan-500/5 p-2 rounded border border-cyan-500/10">
                    <span className="text-cyan-400 text-[10px]">COND: {weather.current.condition.toUpperCase()}</span>
                    {weather.current.condition.toLowerCase().includes('rain') ? <CloudRain size={14} className="text-cyan-300" /> : <Sun size={14} className="text-amber-400" />}
                  </div>
                </div>
              ) : <div className="text-[10px] animate-pulse text-cyan-400/60 uppercase">Searching satellites...</div>}
            </DataCard>
            
            <DataCard title="Bio-Metrics" icon={Activity}>
              <div className="flex justify-between items-center p-2 bg-cyan-500/5 rounded border border-cyan-500/10 text-xs font-mono">
                <span className="text-cyan-400">CORE_T</span>
                <span className="text-white font-bold">{coreTemp.toFixed(1)}°C</span>
              </div>
            </DataCard>

            <DataCard title="Neural Link" icon={Cpu} className="flex-1">
              <div className="flex-1 flex flex-col items-center justify-center relative min-h-[140px]">
                <div className="w-24 h-24 rounded-full border border-cyan-400/10 flex items-center justify-center relative">
                   <motion.div 
                     animate={{ rotate: 360 }}
                     transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                     className="absolute inset-0 border-t-2 border-cyan-400/60 rounded-full" 
                   />
                   <div className="w-16 h-16 rounded-full border border-cyan-400/5 flex items-center justify-center">
                     <span className="text-[9px] font-mono text-cyan-400 animate-pulse uppercase tracking-tighter">Link: OK</span>
                   </div>
                </div>
              </div>
            </DataCard>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-panel w-[95%] mx-auto mb-4 px-6 py-2 flex justify-between items-center z-20 rounded-lg shrink-0 border-cyan-500/20 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <span className="text-[10px] font-mono text-cyan-500/60 tracking-widest uppercase">System Flux</span>
          <div className="flex gap-2">
            {[<Globe size={10} />, <Shield size={10} />, <Zap size={10} />].map((icon, i) => (
              <div key={i} className="p-1 px-3 bg-cyan-500/5 border border-cyan-400/20 rounded flex items-center justify-center text-cyan-400">
                {icon}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-1.5 bg-cyan-500/10 border border-cyan-400/40 rounded-lg cursor-default">
           <User size={12} className="text-cyan-400" />
           <span className="text-[10px] font-display font-bold tracking-widest text-cyan-50 uppercase">{user}</span>
        </div>
      </footer>

      {/* Expanded Chat Overlay */}
      <AnimatePresence>
        {isChatExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col p-4 md:p-10"
          >
            <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05),transparent_70%)] pointer-events-none" />
            
            <div className="max-w-6xl w-full mx-auto h-full flex flex-col relative z-10">
              <div className="flex items-center justify-between mb-8 border-b border-cyan-500/20 pb-4">
                <div className="flex items-center gap-4">
                   <div className="p-2 rounded bg-cyan-500/10 border border-cyan-400/40">
                      <Terminals className="text-cyan-400" size={24} />
                   </div>
                   <div>
                      <h2 className="text-2xl font-display font-bold text-cyan-400 glow-text tracking-[0.2em] uppercase">Neural Console</h2>
                      <div className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest">Uplink Stable // Session: {Date.now()}</div>
                   </div>
                </div>
                <button 
                  onClick={() => setIsChatExpanded(false)}
                  className="p-3 hover:bg-white/5 rounded-full text-cyan-400/60 hover:text-cyan-400 transition-all border border-transparent hover:border-cyan-400/20"
                >
                  <Zap size={24} /> {/* Using Zap as a stylish close icon */}
                  <span className="text-[8px] block mt-1 uppercase font-mono">Terminal Exit</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 mb-8 pr-4">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 text-xl font-mono tracking-[1em] text-cyan-400 animate-pulse">
                     AWAITING COMMANDS...
                  </div>
                )}
                {messages.map((m) => (
                  <motion.div 
                    key={m.id}
                    initial={{ opacity: 0, x: m.sender === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex flex-col gap-3 ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-3 opacity-60 text-[10px] font-mono uppercase tracking-widest">
                      <span className={m.sender === 'kyros' ? "text-cyan-400 font-bold" : "text-white"}>{m.sender === 'kyros' ? 'SYS_INTELLIGENCE' : 'USER_COMMANDER'}</span>
                      <span className="opacity-30">//</span>
                      <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                    
                    <div className={`max-w-[85%] md:max-w-[70%] text-lg md:text-xl font-light leading-relaxed p-6 rounded-2xl border ${
                      m.sender === 'user' 
                        ? 'bg-cyan-500/5 border-cyan-500/30 text-white chat-bubble-user' 
                        : 'bg-white/5 border-white/10 text-cyan-50 chat-bubble-kyros'
                    }`}>
                      <Markdown>{m.text}</Markdown>
                      
                      {m.imageUrl && (
                        <div className="mt-6 rounded-xl border border-cyan-500/30 overflow-hidden shadow-2xl shadow-cyan-500/20 group relative">
                          <img src={m.imageUrl} alt="System Visualization" className="w-full h-auto" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                      
                      {m.videoUrl && (
                        <div className="mt-6 aspect-video rounded-xl border border-cyan-500/30 overflow-hidden bg-black shadow-2xl shadow-cyan-500/20">
                          <iframe 
                            src={m.videoUrl} 
                            className="w-full h-full" 
                            allow="autoplay; encrypted-media; fullscreen; picture-in-picture" 
                            allowFullScreen
                            frameBorder="0"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="mt-auto">
                <form onSubmit={handleTextSubmit} className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-400 transition-all group-focus-within:scale-125 select-none drop-shadow-[0_0_10px_#00f2ff]">
                    <Zap size={28} />
                  </div>
                  <input 
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="ENTER NEURAL COMMAND SIR..."
                    className="w-full bg-cyan-500/5 border border-cyan-500/20 rounded-full py-8 pl-20 pr-10 text-2xl font-light text-white placeholder:text-cyan-500/20 focus:outline-none focus:border-cyan-400 focus:bg-cyan-500/10 focus:shadow-[0_0_50px_rgba(0,242,255,0.1)] transition-all"
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-mono text-cyan-400/40 uppercase tracking-widest pointer-events-none">
                    Press Enter to Execute
                  </div>
                </form>
                
                <div className="mt-6 flex justify-center gap-12 text-[10px] font-mono text-cyan-500/20 tracking-[0.4em] uppercase">
                   <div className="flex items-center gap-2"> Encryption: AES_256</div>
                   <div className="flex items-center gap-2"> Neural Flow: Stable</div>
                   <div className="flex items-center gap-2"> Privacy: Hardened</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
