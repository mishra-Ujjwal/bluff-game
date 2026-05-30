import { motion } from "framer-motion";

const getRingColor = (remainingSeconds) => {
  if (remainingSeconds <= 20) {
    return "#EF4444";
  }
  if (remainingSeconds <= 60) {
    return "#FACC15";
  }
  return "#22C55E";
};

const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

export default function GameTimer({ remainingSeconds = 120, totalSeconds = 120 }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = remainingSeconds / totalSeconds;
  const offset = circumference * (1 - progress);
  const ringColor = getRingColor(remainingSeconds);
  const urgent = remainingSeconds <= 20;

  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={urgent ? { repeat: Number.POSITIVE_INFINITY, duration: 1.2 } : undefined}
      className="glass-panel flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-slate-950/55"
    >
      <div className="relative h-24 w-24">
        <svg className="-rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={ringColor}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Turn</span>
          <span className="text-lg font-black text-white">{formatTime(remainingSeconds)}</span>
        </div>
      </div>
    </motion.div>
  );
}
