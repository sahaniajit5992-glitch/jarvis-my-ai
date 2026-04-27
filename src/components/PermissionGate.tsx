import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MapPin, ShieldCheck, ShieldAlert, ChevronRight, Loader2 } from 'lucide-react';

type PermissionStateValue = "granted" | "denied" | "prompt";

interface Props {
  onAllGranted: () => void;
  onStateChange: (mic: PermissionStateValue, loc: PermissionStateValue) => void;
}

export default function PermissionGate({ onAllGranted, onStateChange }: Props) {
  const [micStatus, setMicStatus] = useState<PermissionStateValue>('prompt');
  const [locStatus, setLocStatus] = useState<PermissionStateValue>('prompt');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we already have permissions (best effort)
    const checkPermissions = async () => {
      try {
        if (navigator.permissions) {
          const mic = await navigator.permissions.query({ name: 'microphone' as any });
          const loc = await navigator.permissions.query({ name: 'geolocation' as any });
          
          setMicStatus(mic.state as PermissionStateValue);
          setLocStatus(loc.state as PermissionStateValue);
          
          mic.onchange = () => setMicStatus(mic.state as PermissionStateValue);
          loc.onchange = () => setLocStatus(loc.state as PermissionStateValue);
        }
      } catch (e) {
        console.warn("Permissions API not fully supported", e);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, []);

  useEffect(() => {
    onStateChange(micStatus, locStatus);
    if (micStatus === 'granted' && locStatus === 'granted') {
      onAllGranted();
    }
  }, [micStatus, locStatus, onAllGranted, onStateChange]);

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicStatus('granted');
    } catch (e) {
      setMicStatus('denied');
    }
  };

  const requestLoc = () => {
    navigator.geolocation.getCurrentPosition(
      () => setLocStatus('granted'),
      () => setLocStatus('denied'),
      { timeout: 5000 }
    );
  };

  if (loading) return null;

  // We only show this if it's not all granted
  if (micStatus === 'granted' && locStatus === 'granted') return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center p-6">
      <div className="scanline" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05),transparent_70%)]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel max-w-lg w-full p-8 rounded-2xl flex flex-col gap-8 relative z-10 border-cyan-500/20 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-full border border-cyan-500/30 flex items-center justify-center mb-2">
            <ShieldCheck size={32} className="text-cyan-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-display font-bold tracking-[0.2em] text-cyan-400 glow-text uppercase">System Authorization</h2>
          <p className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest leading-relaxed">
            Kyros require secure access to primary sensors for optimal performance.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Microphone Access */}
          <div className={`p-4 rounded-lg border transition-all flex items-center justify-between ${
            micStatus === 'granted' ? 'bg-green-500/5 border-green-500/30' : 
            micStatus === 'denied' ? 'bg-red-500/5 border-red-500/30' : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded flex items-center justify-center ${
                micStatus === 'granted' ? 'text-green-400' : 'text-cyan-400'
              }`}>
                <Mic size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-display font-bold tracking-widest text-white uppercase">Voice Interface</span>
                <span className="text-[9px] font-mono text-white/40 uppercase">Audio Input Authorization</span>
              </div>
            </div>
            
            {micStatus !== 'granted' ? (
              <button 
                onClick={requestMic}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/30 rounded text-[9px] font-mono text-cyan-400 transition-all flex items-center gap-2 uppercase tracking-widest"
              >
                Authorize <ChevronRight size={12} />
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-400 font-mono text-[9px] uppercase tracking-widest">
                <ShieldCheck size={14} /> Active
              </div>
            )}
          </div>

          {/* Location Access */}
          <div className={`p-4 rounded-lg border transition-all flex items-center justify-between ${
            locStatus === 'granted' ? 'bg-green-500/5 border-green-500/30' : 
            locStatus === 'denied' ? 'bg-red-500/5 border-red-500/30' : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded flex items-center justify-center ${
                locStatus === 'granted' ? 'text-green-400' : 'text-cyan-400'
              }`}>
                <MapPin size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-display font-bold tracking-widest text-white uppercase">Spatial Awareness</span>
                <span className="text-[9px] font-mono text-white/40 uppercase">Geo-Positioning Authorization</span>
              </div>
            </div>
            
            {locStatus !== 'granted' ? (
              <button 
                onClick={requestLoc}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/30 rounded text-[9px] font-mono text-cyan-400 transition-all flex items-center gap-2 uppercase tracking-widest"
              >
                Authorize <ChevronRight size={12} />
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-400 font-mono text-[9px] uppercase tracking-widest">
                <ShieldCheck size={14} /> Active
              </div>
            )}
          </div>
        </div>

        {(micStatus === 'denied' || locStatus === 'denied') && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3">
            <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest font-bold">Access Refused by User</span>
              <p className="text-[8px] text-red-300/60 leading-relaxed uppercase">
                System functionality is currently limited. Please enable permissions in your browser settings (Lock icon 🔒 in the URL bar) and refresh.
              </p>
            </div>
          </div>
        )}

        <div className="pt-4 flex flex-col gap-2">
          <button 
            disabled={micStatus === 'granted' && locStatus === 'granted'}
            onClick={() => onAllGranted()}
            className="w-full py-4 border border-white/10 hover:bg-white/5 disabled:opacity-20 transition-all text-white/40 font-mono text-[10px] uppercase tracking-[0.3em] rounded-xl"
          >
            Bypass & Restricted Access
          </button>
          <div className="text-center">
            <span className="text-[7px] font-mono text-cyan-500/30 uppercase tracking-[0.5em]">K-OS_PERMISSION_GATE_v2.0</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
