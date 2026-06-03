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
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mins = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const secs = String(safeSeconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

export default function GameTimer({ remainingSeconds = 60, totalSeconds = 60, label = "Turn" }) {
  const safeTotalSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 60;
  const safeRemainingSeconds = Number.isFinite(remainingSeconds)
    ? Math.min(safeTotalSeconds, Math.max(0, Math.floor(remainingSeconds)))
    : safeTotalSeconds;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = safeRemainingSeconds / safeTotalSeconds;
  const offset = circumference * (1 - progress);
  const ringColor = getRingColor(safeRemainingSeconds);
  const urgent = safeRemainingSeconds > 0 && safeRemainingSeconds <= 20;

  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={urgent ? { repeat: Number.POSITIVE_INFINITY, duration: 1.2 } : undefined}
      className="glass-panel flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-950/55 sm:h-20 sm:w-20 lg:h-28 lg:w-28"
    >
      <div className="relative h-14 w-14 sm:h-16 sm:w-16 lg:h-24 lg:w-24">
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
          <span className="text-[8px] uppercase tracking-[0.22em] text-slate-400 sm:text-[9px] lg:text-[11px]">{label}</span>
          <span className="text-[11px] font-black text-white sm:text-sm lg:text-lg">{formatTime(safeRemainingSeconds)}</span>
        </div>
      </div>
    </motion.div>
  );
}
