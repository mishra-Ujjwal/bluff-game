import { memo } from "react";
import { Crown, Wifi, WifiOff } from "lucide-react";
import { motion } from "framer-motion";

function PlayerBadgeComponent({ player, isTurn, isMe, compact = false }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`glass-panel relative overflow-hidden rounded-[1.75rem] border p-2 ${
        isTurn ? "border-secondary/70 bg-secondary/10 shadow-[0_0_35px_rgba(56,189,248,0.2)]" : "border-white/10"
      } ${compact ? "min-h-[78px] px-3 py-2.5" : "min-h-[118px]"}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_35%)]" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          {/* <div
            className={`flex items-center justify-center border font-black uppercase ${
              compact ? "h-9 w-9 rounded-xl text-xs" : "h-11 w-11 rounded-2xl text-sm"
            } ${
              isTurn ? "border-secondary bg-secondary/20 text-white" : "border-white/10 bg-slate-950/60 text-slate-200"
            }`}
          >
            {player.username.slice(0, 2)}
          </div> */}
          <div className="min-w-0">
            <p className={`truncate font-semibold text-white ${compact ? "text-base" : ""}`}>
              {player.username}
              {isMe ? <span className="ml-2 text-xs font-medium text-sky-300">(You)</span> : null}
            </p>
            <p className={`${compact ? "text-xs" : "text-sm"} text-slate-400`}>{player.cardsCount} cards left</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-full font-medium ${
              compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
            } ${
              player.connected ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
            }`}
          >
            {player.connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {player.connected ? "Online" : "Offline"}
          </span>
          {player.isHost ? (
            <span
              className={`flex items-center gap-1 rounded-full bg-amber-500/15 font-medium text-amber-300 ${
                compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
              }`}
            >
              <Crown size={12} />
              Host
            </span>
          ) : null}
        </div>
      </div>
      {isTurn ? (
        <div
          className={`relative border border-secondary/25 bg-slate-950/40 font-semibold uppercase tracking-[0.3em] text-sky-200 ${
            compact ? "mt-2 rounded-xl px-2 py-1 text-[10px]" : "mt-4 rounded-2xl px-3 py-2 text-xs"
          }`}
        >
          Current Turn
        </div>
      ) : null}
    </motion.div>
  );
}

const PlayerBadge = memo(PlayerBadgeComponent);

export default PlayerBadge;
