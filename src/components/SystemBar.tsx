import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Cpu, Zap, Activity, Battery, Signal, Globe } from "lucide-react";

export default function SystemBar() {
  const [metrics, setMetrics] = useState({
    cpu: "0.00",
    memory: "0.00",
    uptime: "0.00 hours",
    battery: 100,
  });

  useEffect(() => {
    const fetchMetrics = () => {
      fetch("/api/system/status")
        .then(res => res.json())
        .then(data => {
          if (data.status === "success") {
            setMetrics(data.data);
          }
        })
        .catch(() => {});
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-black/40 backdrop-blur-xl border-b border-cyan-500/10 px-4 py-1.5 flex items-center justify-between text-[10px] font-mono tracking-tighter z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-cyan-400/80">
          <Activity size={10} className="animate-pulse" />
          <span className="uppercase opacity-40">System:</span>
          <span className="text-cyan-400">OPTIMAL</span>
        </div>
        <div className="h-2 w-[1px] bg-white/10" />
        <div className="flex items-center gap-1.5 text-cyan-400/80">
          <Cpu size={10} />
          <span className="uppercase opacity-40">CPU:</span>
          <span>{metrics.cpu}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-cyan-400/80">
          <Zap size={10} />
          <span className="uppercase opacity-40">MEM:</span>
          <span>{metrics.memory}%</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-cyan-400/80">
          <Signal size={10} />
          <span className="uppercase opacity-40">Network:</span>
          <span className="text-green-500">ENCRYPTED</span>
        </div>
        <div className="flex items-center gap-1.5 text-cyan-400/80">
          <Battery size={10} />
          <span className="uppercase opacity-40">PWR:</span>
          <span>STABLE</span>
        </div>
        <div className="flex items-center gap-1 text-cyan-400/60 pl-2">
          <Globe size={10} />
          <span>V1.0.4_ELITE</span>
        </div>
      </div>
    </div>
  );
}
