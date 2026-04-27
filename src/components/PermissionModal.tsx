import React from 'react';
import { motion } from 'motion/react';
import { MicOff } from 'lucide-react';

interface Props {
  onClose: () => void;
  error?: string | null;
  isSecure?: boolean;
}

export default function PermissionModal({ onClose, error, isSecure }: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-[#050505] border border-cyan-500/20 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-cyan-500" />
        
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <MicOff size={32} className="text-amber-400" />
        </div>
        
        <h2 className="text-2xl font-display font-medium text-white mb-2 tracking-wide uppercase">Communication Restricted</h2>
        
        {!isSecure && (
          <div className="mb-4 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-[10px] font-mono text-amber-400 uppercase tracking-tighter italic">! SECURITY PROTOCOL ALERT !</p>
            <p className="text-xs text-amber-300/80">Insecure Context Detected. Browsers disable microphone access unless using <strong>HTTPS</strong> or <strong>localhost</strong>.</p>
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-[10px] font-mono text-red-400 uppercase tracking-tighter">System Error:</p>
            <p className="text-xs text-red-300/80">{error}</p>
          </div>
        )}

        <p className="text-white/60 text-sm mb-6 leading-relaxed">
          Primary audio input is currently blocked. Kyros requires microphone authorization to process verbal commands.
        </p>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left w-full mb-8">
          <p className="text-xs text-cyan-400 font-mono uppercase mb-3 tracking-widest underline underline-offset-4">Troubleshooting Protocol:</p>
          <ol className="text-xs text-white/50 list-decimal pl-4 space-y-3">
            <li>Click the <strong>lock (🔒)</strong> or <strong>settings (⚙️)</strong> icon in the URL bar.</li>
            <li>Ensure <strong>Microphone</strong> is set to <span className="text-green-400">Allow</span>.</li>
            <li><strong>Security Warning:</strong> If you use an IP address (e.g., <code>192.168.x.x</code>), Chrome will block the mic. Please use <code>localhost</code> or an <code>HTTPS</code> domain.</li>
            <li>Verify your hardware microphone is physically connected and active.</li>
          </ol>
        </div>
        
        <div className="flex flex-col w-full gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 px-4 bg-cyan-500 text-black font-display font-bold rounded-xl hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] uppercase tracking-widest"
          >
            Re-Initialize Systems
          </button>
          <button 
            onClick={onClose}
            className="w-full py-3 px-4 bg-white/5 text-white/40 font-mono text-[10px] uppercase tracking-tighter rounded-xl hover:bg-white/10 transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
