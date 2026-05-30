import { memo } from "react";
import { motion } from "framer-motion";

const SUIT_SYMBOLS = {
  H: "♥",
  D: "♦",
  C: "♣",
  S: "♠",
};

const SUIT_COLORS = {
  H: "text-red-500",
  D: "text-red-500",
  C: "text-slate-900",
  S: "text-slate-900",
};

function PlayingCardComponent({ card, active, disabled, onClick, index = 0, faceDown = false }) {
  if (faceDown) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18, rotate: -8 }}
        animate={{ opacity: 1, y: 0, rotate: -4 + index * 2 }}
        className="card-shadow flex h-20 w-14 items-center justify-center rounded-[0.9rem] border border-sky-300/30 bg-[linear-gradient(135deg,#1d4ed8,#7c3aed)] sm:h-24 sm:w-16"
      >
        <div className="h-14 w-9 rounded-lg border border-white/25 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_45%)] sm:h-16 sm:w-10" />
      </motion.div>
    );
  }

  const suit = SUIT_SYMBOLS[card.suit] || card.suit;
  const suitColor = SUIT_COLORS[card.suit] || "text-slate-900";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 30, rotate: -6 + index * 1.75 }}
      animate={{
        opacity: disabled ? 0.55 : 1,
        y: active ? -12 : 0,
        rotate: -10 + index * 3,
        scale: active ? 1.04 : 1,
      }}
      whileHover={disabled ? undefined : { y: active ? -14 : -5, rotate: -8 + index * 3, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`card-shadow relative h-24 w-[3.9rem] shrink-0 rounded-[0.9rem] border bg-white p-1.5 text-left sm:h-28 sm:w-[4.4rem] sm:p-2 ${
        active ? "border-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.35)]" : "border-slate-200"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      style={{ marginLeft: index === 0 ? 0 : -20, zIndex: active ? 200 + index : index + 1 }}
    >
      <div className={`flex h-full flex-col justify-between ${suitColor}`}>
        <div className="leading-none">
          <p className="text-sm font-black sm:text-base">{card.rank}</p>
          <p className="text-xs sm:text-sm">{suit}</p>
        </div>
        <div className="flex justify-center text-2xl opacity-85 sm:text-3xl">{suit}</div>
        <div className={`self-end text-right leading-none ${suitColor}`}>
          <p className="rotate-180 text-xs sm:text-sm">{suit}</p>
          <p className="rotate-180 text-sm font-black sm:text-base">{card.rank}</p>
        </div>
      </div>
    </motion.button>
  );
}

const PlayingCard = memo(PlayingCardComponent);

export default PlayingCard;
