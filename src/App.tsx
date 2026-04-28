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
import { motion, AnimatePresence } from "motion/react";

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
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const tempTimer = setInterval(() => setCoreTemp(prev => prev + (Math.random() - 0.5)), 2000);
    return () => {
      clearInterval(timer);
      clearInterval(tempTimer);
    };
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

  const executeAction = useCallback((action: string | { name: string, args: any }) => {
    let command: string;
    let params: any[];

    if (typeof action === "string") {
      const parts = action.split(":");
      if (parts.length < 2) return;
      command = parts[1];
      params = parts.slice(2);
    } else {
      command = action.name;
      params = Object.values(action.args);
      // Map function names to existing logic if needed, or handle directly
    }

    switch (command) {
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
          } else {
            let website = app.trim();
            if (!website.includes(".")) website += ".com";
            window.open(`https://www.${website}`, "_blank");
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
        break;
      }
      case "keyboardControl": {
        const { action: kAction, text } = (action as any).args;
        fetch("/api/automate/keyboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: kAction, text }),
        }).catch(console.error);
        break;
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
        }
        break;
      }
      case "getWeather":
      case "get_weather": {
        const loc = typeof action === "object" ? action.args.location : params[0];
        if (loc) {
          window.open(`https://www.google.com/search?q=weather+in+${encodeURIComponent(loc)}`, "_blank");
        }
        break;
      }
      case "setReminder":
      case "set_reminder": {
        const topic = typeof action === "object" ? action.args.topic : params[0];
        if (topic) {
          window.open(`https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent('Reminder: ' + topic)}`, "_blank");
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
        break;
      case "browserAutomation":
      case "browser_automation": {
        const bAction = typeof action === "object" ? action.args.action : params[0];
        const target = typeof action === "object" ? action.args.target : params[1];
        if (bAction && target) {
          fetch("/api/automate/browser", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: bAction, search: target, url: target }),
          })
          .then(res => res.json())
          .then(data => {
            if (bAction === "search_youtube" && data.videoUrl) {
              setMessages(prev => [...prev, {
                id: Date.now().toString() + "-vid",
                sender: "kyros",
                text: `I've successfully navigated via automation. Here is the primary video stream, sir.`,
                videoUrl: data.videoUrl.replace("watch?v=", "embed/")
              }]);
            } else if (bAction === "screenshot" && data.screenshot) {
              setMessages(prev => [...prev, {
                id: Date.now().toString() + "-shot",
                sender: "kyros",
                text: `Digital snapshot captured of ${target}, sir.`,
                imageUrl: `data:image/png;base64,${data.screenshot}`
              }]);
            }
          }).catch(console.error);
        }
        break;
      }
      case "sendWhatsApp": {
        const { recipient, message } = (action as any).args;
        window.open(`https://web.whatsapp.com/send?phone=${recipient}&text=${encodeURIComponent(message)}`, "_blank");
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
        break;
      }
      case "playVideo":
      case "play_video": {
        const query = typeof action === "object" ? action.args.query : params.join(":");
        const platform = typeof action === "object" ? (action as any).args.platform : "youtube";
        if (query) {
          if (platform === "spotify") {
            window.open(`https://open.spotify.com/search/${encodeURIComponent(query)}`, "_blank");
          }
          setMessages((prev) => [...prev, { 
            id: Date.now().toString() + "-vid", 
            sender: "kyros", 
            text: `I have initiated the stream for "${query}", Sir. Bringing it up for you.`,
            videoUrl: platform === "youtube" ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}` : undefined
          }]);
        }
        break;
      }
      case "generateImage":
      case "generate_image": {
        const prompt = typeof action === "object" ? action.args.prompt : params.join(":");
        if (prompt) {
          (async () => {
             const imageUrl = await generateKyrosImage(prompt);
             if (imageUrl) {
               setMessages((prev) => [...prev, { 
                 id: Date.now().toString() + "-img", 
                 sender: "kyros", 
                 text: "I have generated the image as requested, sir.",
                 imageUrl 
               }]);
             } else {
                setMessages((prev) => [...prev, { 
                  id: Date.now().toString() + "-err", 
                  sender: "kyros", 
                  text: "I apologize, sir, but I encountered an error during the rendering process." 
                }]);
             }
          })();
        }
        break;
      }
      case "open_youtube_search":
        if (params[0]) {
          window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(params[0])}`, "_blank");
        }
        break;
      case "open_spotify_search":
        if (params[0]) {
          window.open(`https://open.spotify.com/search/${encodeURIComponent(params[0])}`, "_blank");
        }
        break;
      case "open_gmail":
        window.open(`https://mail.google.com`, "_blank");
        break;
      case "open_whatsapp_web":
        window.open(`https://web.whatsapp.com`, "_blank");
        break;
      case "play_music":
      case "play_youtube_video":
        if (params[0]) {
          window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(params[0])}`, "_blank");
        }
        break;
      case "send_whatsapp":
        if (params[0] && params[1]) {
          window.open(`https://web.whatsapp.com/send?phone=${params[0]}&text=${encodeURIComponent(params[1])}`, "_blank");
        }
        break;
      case "get_time":
        window.open(`https://www.google.com/search?q=current+time`, "_blank");
        break;
      case "play_music_genre":
        if (params[0]) {
          window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(params[0] + ' music')}`, "_blank");
        }
        break;
      case "get_news":
        if (params[0]) {
          window.open(`https://news.google.com/search?q=${encodeURIComponent(params[0])}`, "_blank");
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
                const aiResult = await getKyrosResponse(`Analyze this content from ${url} and explain it briefly: ${data.content}`, messages);
                setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "kyros", text: aiResult.text }]);
              }
            } catch (err) {
              console.error(err);
            }
          })();
        }
        break;
      default:
        console.warn("Unknown command:", command);
    }
  }, []);

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
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-j", sender: "kyros", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getKyrosAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      setTimeout(() => {
        if (commandResult.url) {
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

      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getKyrosAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      // Handle function calls if present
      if (kyrosRes.functionCalls && kyrosRes.functionCalls.length > 0) {
        setTimeout(() => {
          kyrosRes.functionCalls.forEach((fc: any) => executeAction(fc));
        }, 1200);
      }

      // Fallback to action matches if function calls were not used but actions were written in text
      if (actionMatch && (!kyrosRes.functionCalls || kyrosRes.functionCalls.length === 0)) {
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
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
          parseUICommands(text);

          // Wake Word Detection
          if (sender === "user" && (text.toLowerCase().includes("kyros") || text.toLowerCase().includes("hey kyros") || text.toLowerCase().includes("jarvis"))) {
            console.log("Wake word detected in transcript");
          }
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
      <header className="glass-panel w-[95%] mx-auto mt-4 px-6 py-3 flex justify-between items-center z-20 rounded-lg shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400 glow-border">
              <Activity className="text-cyan-400" size={16} />
            </div>
            <h1 className="text-xl font-display font-bold tracking-[0.2em] text-cyan-400 glow-text">KYROS SYSTEM</h1>
          </div>
          <div className="text-[10px] font-mono text-cyan-500/60 ml-11 uppercase leading-none border-l border-cyan-400/20 pl-2">
            BIO-RECOGNITION: {user} // AUTH_LVL: 5
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-cyan-400 group relative"
          >
            <Settings className="group-hover:rotate-90 transition-transform duration-500" size={20} />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest bg-black/80 px-2 py-1 rounded border border-cyan-500/20">System Config</span>
          </button>
          <div className="flex flex-col items-end font-mono text-cyan-400">
            <div className="text-xl tracking-tighter">{time.toLocaleTimeString([], { hour12: false })}</div>
            <div className="text-[10px] opacity-60"> // {time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 p-2 md:p-6 z-10 overflow-hidden min-h-0 relative">
        <AnimatePresence mode="wait">
          {uiMode === "voice" ? (
            <motion.div 
              key="voice-mode"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4"
            >
              {/* Sidebar Diagnostics - Hidden on small mobile in voice mode if preferred */}
              <div className="md:col-span-3 flex flex-col gap-4 overflow-y-auto scrollbar-hide min-h-0 order-2 md:order-1">
                <DataCard title="Meteorological" icon={Cloud}>
                  {weather ? (
                    <div className="flex flex-col gap-4 text-xs font-mono">
                      <div className="flex justify-between items-center bg-cyan-500/5 p-2 rounded border border-cyan-500/10">
                        <span className="text-cyan-400">LOC: {weather.current.city.toUpperCase()}</span>
                        <span className="text-white">{weather.current.temp}°C</span>
                      </div>
                      <div className="flex justify-between items-center bg-cyan-500/5 p-2 rounded border border-cyan-500/10">
                        <span className="text-cyan-400">COND: {weather.current.condition.toUpperCase()}</span>
                      </div>
                    </div>
                  ) : <div className="text-[10px] animate-pulse">SEARCHING SATELLITE...</div>}
                </DataCard>
                
                <DataCard title="Bio-Metrics" icon={Activity}>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-cyan-400">CORE_T</span>
                    <span className="text-white">{coreTemp.toFixed(1)}°C</span>
                  </div>
                </DataCard>

                <DataCard title="Neural Link" icon={Cpu} className="flex-1">
                  <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="w-16 h-16 rounded-full border border-cyan-400/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border border-cyan-400/50 animate-ping" />
                      <span className="absolute text-[8px] font-mono text-cyan-400">LINK: OK</span>
                    </div>
                  </div>
                </DataCard>
              </div>

              {/* Main Visualizer */}
              <div className="md:col-span-6 flex flex-col items-center justify-center relative min-h-0">
                <Visualizer state={appState} colorOverride={vizColor} intensityOverride={vizIntensity} mode={vizMode} />
                
                <div className="mt-12 flex items-center gap-8 z-20">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleListening}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                      isSessionActive 
                        ? "bg-cyan-500 shadow-[0_0_50px_rgba(0,242,255,0.6)] ring-4 ring-cyan-500/30" 
                        : "bg-white/5 border border-cyan-400/50 hover:bg-cyan-500/20"
                    }`}
                  >
                    {isSessionActive ? <Mic size={40} className="text-white" /> : <MicOff size={40} className="text-cyan-400" />}
                  </motion.button>
                  
                  <div className="flex flex-col gap-4">
                    <button onClick={() => setIsMuted(!isMuted)} className="p-4 rounded-full glass-panel hover:bg-cyan-500/20 transition-colors">
                      {isMuted ? <VolumeX size={24} className="text-red-400" /> : <Volume2 size={24} className="text-cyan-400" />}
                    </button>
                    <button onClick={() => setUiMode("chat")} className="p-4 rounded-full glass-panel hover:bg-cyan-500/20 transition-colors">
                      <Terminals size={24} className="text-cyan-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* System Log Mini */}
              <div className="md:col-span-3 flex flex-col gap-4 h-full">
                <DataCard title="Sub-System Stats" icon={Shield}>
                   <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-center text-[10px] font-mono border-b border-cyan-500/5 pb-1">
                       <span className="text-cyan-400/60">MIC_LINK</span>
                       <span className={micState === 'granted' ? "text-green-400" : "text-amber-400"}>{micState.toUpperCase()}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-mono border-b border-cyan-500/5 pb-1">
                       <span className="text-cyan-400/60">LOC_SENS</span>
                       <span className={locState === 'granted' ? "text-green-400" : "text-amber-400"}>{locState.toUpperCase()}</span>
                     </div>
                     {['OS', 'NET', 'SEC', 'AI'].map(sys => (
                       <div key={sys} className="flex justify-between items-center text-[10px] font-mono border-b border-cyan-500/5 pb-1">
                         <span className="text-cyan-400/60">{sys}_MTRX</span>
                         <span className="text-green-400">STABLE</span>
                       </div>
                     ))}
                   </div>
                </DataCard>
                <div className="glass-panel flex-1 rounded-lg border border-cyan-400/10 p-2 overflow-hidden flex flex-col">
                  <span className="text-[8px] font-mono text-cyan-400/50 mb-2 uppercase tracking-widest">Global Stream</span>
                  <div className="flex-1 overflow-y-auto scrollbar-hide text-[9px] font-mono text-cyan-200/40 lowercase space-y-1">
                    {messages.slice(-5).map(m => (
                      <div key={m.id}>- {m.sender}: {m.text.substring(0, 30)}...</div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat-mode"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="h-full flex flex-col gap-4 max-w-5xl mx-auto w-full"
            >
              <div className="flex items-center justify-between shrink-0 mb-4 px-2">
                <div className="flex items-center gap-4">
                  <button onClick={() => setUiMode("voice")} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-200 transition-colors font-mono text-xs">
                    <Mic size={14} /> BACK_TO_IMMERSIVE
                  </button>
                  <div className="h-4 w-[1px] bg-white/10" />
                  <span className="text-white/40 font-mono text-[10px] uppercase tracking-widest">Autonomous Terminal Console v2.4</span>
                </div>
                <button onClick={() => { if(confirm("CLEAR LOGS?")) setMessages([]); }} className="text-red-400 hover:text-red-300 font-mono text-[10px]">
                  PURGE_HISTORY
                </button>
              </div>

              <div className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col border border-cyan-500/20 bg-black/60 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-cyan-500/20">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-cyan-400 gap-4">
                      <Activity size={48} className="animate-pulse" />
                      <span className="font-mono text-xs tracking-[0.4em]">AWAITING SYSTEM DATA...</span>
                    </div>
                  )}
                  {messages.map((m) => (
                    <motion.div 
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-2 mb-2 opacity-40 font-mono text-[8px] uppercase">
                        {m.sender === "user" ? <User size={8} /> : <Zap size={8} className="text-cyan-400" />}
                        {m.sender} // {new Date().toLocaleTimeString()}
                      </div>
                      <div className={`max-w-[90%] md:max-w-[85%] p-3 md:p-4 rounded-lg font-mono text-xs md:text-sm leading-relaxed ${
                        m.sender === "user" 
                          ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-50" 
                          : "bg-white/5 border border-white/10 text-cyan-100 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]"
                      }`}>
                        {m.text}
                        {m.imageUrl && (
                          <div className="mt-4 rounded-lg overflow-hidden border border-cyan-400/30 shadow-[0_0_20px_rgba(0,242,255,0.1)]">
                            <img 
                              src={m.imageUrl} 
                              alt="Generated by Kyros" 
                              className="w-full h-auto object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        {m.videoUrl && (
                          <div className="mt-4 aspect-video rounded-lg overflow-hidden border border-cyan-400/30 shadow-[0_0_20px_rgba(0,242,255,0.1)] bg-black">
                            <iframe 
                              src={m.videoUrl} 
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-cyan-500/20 bg-black/40">
                  <form onSubmit={handleTextSubmit} className="flex gap-4">
                    <div className="flex-1 relative">
                       <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/50">{">"}</div>
                       <input 
                         type="text"
                         value={textInput}
                         onChange={(e) => setTextInput(e.target.value)}
                         placeholder="INPUT_COMMAND_STRING..."
                         className="w-full bg-cyan-500/5 border border-cyan-500/20 rounded-lg py-4 pl-10 pr-4 text-white font-mono placeholder:text-white/10 focus:outline-none focus:border-cyan-400 transition-all shadow-inner"
                         autoFocus
                       />
                    </div>
                    <button type="submit" className="px-8 bg-cyan-600 hover:bg-cyan-700 text-white font-display font-bold tracking-widest rounded-lg transition-all shadow-[0_0_20px_rgba(0,242,255,0.2)]">
                      EXECUTE
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="glass-panel w-[95%] mx-auto mb-4 px-6 py-2 flex justify-between items-center z-20 rounded-lg shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-[10px] font-display text-cyan-500/60 tracking-widest uppercase">Active Modules</span>
          <div className="flex gap-2">
            {[<Globe size={10} />, <Shield size={10} />, <Zap size={10} />].map((icon, i) => (
              <div key={i} className="p-1 px-3 bg-cyan-500/10 border border-cyan-400/30 rounded flex items-center justify-center">
                {icon}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-1 bg-cyan-500/20 border border-cyan-400 rounded-lg cursor-default">
           <User size={14} className="text-cyan-400" />
           <span className="text-xs font-display font-bold tracking-widest text-cyan-50 uppercase">{user}</span>
        </div>
      </footer>
    </div>
  );
}
