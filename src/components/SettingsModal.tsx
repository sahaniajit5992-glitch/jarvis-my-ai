import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Settings, Palette, Zap, Monitor, Smartphone, Watch } from "lucide-react";

interface SettingsModalProps {
  onClose: () => void;
  onSave: (color: string, intensity: "high" | "low", deviceMode: "pc" | "mobile" | "watch", wakeWord: string) => void;
  initialColor: string;
  initialIntensity: "high" | "low";
  initialDeviceMode: "pc" | "mobile" | "watch";
  initialWakeWord: string;
}

const COLORS = [
  { name: "Cyan", value: "#00f2ff" },
  { name: "Flame", value: "#ff4d00" },
  { name: "Emerald", value: "#00ff88" },
  { name: "Violet", value: "#8800ff" },
  { name: "Gold", value: "#fbbf24" },
];

export default function SettingsModal({ onClose, onSave, initialColor, initialIntensity, initialDeviceMode, initialWakeWord }: SettingsModalProps) {
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [selectedIntensity, setSelectedIntensity] = useState(initialIntensity);
  const [deviceMode, setDeviceMode] = useState(initialDeviceMode);
  const [wakeWord, setWakeWord] = useState(initialWakeWord);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-[#050505] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,242,255,0.15)] max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-cyan-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="text-cyan-400" size={20} />
              <h2 className="text-lg font-display font-bold tracking-widest text-cyan-400">SYSTEM PREFERENCES</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-cyan-400/60 hover:text-cyan-400">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* Interface Mode */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/60 uppercase tracking-tighter">
                <Monitor size={14} />
                <span>Interface Mode</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "pc", label: "PC (HUD)", icon: <Monitor size={16} /> },
                  { value: "mobile", label: "Mobile", icon: <Smartphone size={16} /> },
                  { value: "watch", label: "Watch / AR", icon: <Watch size={16} /> }
                ].map(mode => (
                  <button
                    key={mode.value}
                    onClick={() => setDeviceMode(mode.value as any)}
                    className={`flex flex-col items-center justify-center gap-2 py-3 border rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all ${
                      deviceMode === mode.value 
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.2)]" 
                        : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                    }`}
                  >
                    {mode.icon}
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Wake Word */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/60 uppercase tracking-tighter">
                <Zap size={14} />
                <span>Wake Word / Designation</span>
              </div>
              <input 
                type="text"
                value={wakeWord}
                onChange={(e) => setWakeWord(e.target.value)}
                placeholder="e.g. Kyros, Jarvis"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-cyan-50 font-mono text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-cyan-500/30 uppercase tracking-widest"
              />
            </div>

            {/* Color Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/60 uppercase tracking-tighter">
                <Palette size={14} />
                <span>Primary Interface Color</span>
              </div>
              <div className="flex flex-wrap gap-4">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedColor(c.value)}
                    className={`w-10 h-10 rounded-full border-2 transition-all p-1 ${
                      selectedColor === c.value ? "border-white" : "border-transparent"
                    }`}
                  >
                    <div 
                      className="w-full h-full rounded-full shadow-lg" 
                      style={{ backgroundColor: c.value }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/60 uppercase tracking-tighter">
                <Zap size={14} />
                <span>Visualizer Response Intensity</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(["low", "high"] as const).map((int) => (
                  <button
                    key={int}
                    onClick={() => setSelectedIntensity(int)}
                    className={`px-4 py-3 rounded-lg border font-mono text-xs uppercase tracking-widest transition-all ${
                      selectedIntensity === int 
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.2)]" 
                        : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                    }`}
                  >
                    {int} Power
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-cyan-500/10 flex gap-4 bg-white/5">
            <button 
              onClick={onClose}
              className="flex-1 py-3 text-xs font-mono tracking-widest text-cyan-500/80 hover:text-cyan-400 transition-colors uppercase"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                onSave(selectedColor, selectedIntensity, deviceMode, wakeWord);
                onClose();
              }}
              className="flex-1 py-3 bg-cyan-500 text-[#050505] font-display font-bold text-xs tracking-[0.2em] uppercase rounded hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all"
            >
              Apply Changes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
