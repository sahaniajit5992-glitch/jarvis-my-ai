import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

interface VisualizerProps {
  state: VisualizerState;
  colorOverride?: string;
  intensityOverride?: "high" | "low";
  mode?: "classic" | "circular" | "spectrum";
  optimizationLevel?: number; // 0: no optimization, 1: medium, 2: heavy
}

export default function Visualizer({ state, colorOverride, intensityOverride, mode = "circular", optimizationLevel = 0 }: VisualizerProps) {
  const getTheme = () => {
    const base = (() => {
      switch (state) {
        case "listening": return { color: "#00f2ff", speed: 2, scale: 1.05 };
        case "processing": return { color: "#fbbf24", speed: 1, scale: 1.02 };
        case "speaking": return { color: "#00d4ff", speed: 0.5, scale: 1.1 };
        default: return { color: "rgba(0, 242, 255, 0.5)", speed: 10, scale: 1 };
      }
    })();

    if (colorOverride) base.color = colorOverride;
    if (intensityOverride) {
      if (intensityOverride === "high") base.scale *= 1.3;
      if (intensityOverride === "low") base.scale *= 0.7;
    }
    
    // Core optimization: Reduce speed and complexity based on load
    if (optimizationLevel >= 1) {
      base.speed *= 0.5; // Slower rotations
    }
    
    return base;
  };

  const theme = getTheme();

  return (
    <div className="relative flex items-center justify-center w-full aspect-square max-w-[400px]">
      {/* Outer Rotating Ring with Markings - Hidden at high load */}
      {optimizationLevel < 2 && (
        <motion.div
          animate={optimizationLevel === 1 ? { rotate: 360 } : { rotate: 360 }}
          transition={{ duration: theme.speed * 10, repeat: Infinity, ease: "linear" }}
          className="absolute w-[95%] h-[95%] rounded-full border-[1px] border-cyan-400/20"
          style={{ borderStyle: 'dashed', borderColor: theme.color }}
        />
      )}

      {/* Primary HUD Ring (Segmented) */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: theme.speed * 15, repeat: Infinity, ease: "linear" }}
        className="absolute w-[80%] h-[80%] rounded-full border-[8px] border-cyan-400/10"
        style={{ 
          borderTopColor: theme.color, 
          borderBottomColor: theme.color,
          opacity: state === "idle" ? 0.3 : 0.8
        }}
      />

      {/* Secondary Inner Ring - Hidden at high load */}
      {optimizationLevel < 1 && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: theme.speed * 8, repeat: Infinity, ease: "linear" }}
          className="absolute w-[65%] h-[65%] rounded-full border-[2px] border-cyan-400/30"
          style={{ borderStyle: 'dotted', borderColor: theme.color }}
        />
      )}

      {/* Hexagonal Pattern / Scanning Ring - Simplified at high load */}
      <motion.div
        animate={optimizationLevel >= 1 ? { opacity: 0.1 } : { scale: [0.95, 1.05, 0.95], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[50%] h-[50%] rounded-full bg-gradient-to-t from-transparent via-cyan-400/5 to-transparent border border-cyan-400/20"
      />

      {/* Central Core */}
      <motion.div
        animate={{ 
          scale: theme.scale,
          boxShadow: optimizationLevel >= 2 
            ? `0 0 20px ${theme.color}22` 
            : `0 0 ${state === 'idle' ? '20px' : '50px'} ${theme.color}44, inset 0 0 20px ${theme.color}44`
        }}
        className="absolute w-[40%] h-[40%] rounded-full bg-black/40 backdrop-blur-md border border-cyan-400/40 flex items-center justify-center z-10"
      >
        <div className="relative flex items-center justify-center">
          {/* Inner pulsating glass circle - Hidden at high load */}
          {optimizationLevel < 2 && (
            <motion.div 
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute w-24 h-24 rounded-full bg-cyan-400/10 blur-xl"
            />
          )}
          <span className="font-display font-black tracking-[0.3em] text-cyan-400 glow-text text-xl z-20">
            KYROS
          </span>
        </div>
      </motion.div>

      {/* Scanning Line (Horizontal) - Hidden at medium load */}
      {optimizationLevel === 0 && (
        <motion.div 
          animate={{ top: ['20%', '80%', '20%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute left-[10%] right-[10%] h-[1px] bg-cyan-400/50 shadow-[0_0_10px_#00f2ff] opacity-20 pointer-events-none"
        />
      )}

      {/* State Text Label */}
      <div className="absolute -bottom-12 flex flex-col items-center">
        <motion.span 
          key={state}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-mono tracking-[0.5em] text-cyan-400 uppercase glow-text"
        >
          {state === "idle" ? "System Standby" : `${state} Protocol...`}
        </motion.span>
      </div>
    </div>
  );
}
