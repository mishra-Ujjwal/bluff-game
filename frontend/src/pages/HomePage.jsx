import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Plus, ScrollText, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import { useRoomStore } from "../store/roomStore";

const floatingCards = [
  { rank: "A", suit: "♠", top: "10%", left: "8%", rotate: -14 },
  { rank: "K", suit: "♥", top: "22%", left: "72%", rotate: 12 },
  { rank: "7", suit: "♦", top: "58%", left: "14%", rotate: 9 },
  { rank: "Q", suit: "♣", top: "70%", left: "78%", rotate: -10 },
];

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const createRoom = useRoomStore((state) => state.createRoom);
  const joinRoom = useRoomStore((state) => state.joinRoom);
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [joinCode, setJoinCode] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [action, setAction] = useState(null);

  const stats = useMemo(
    () => [
      { label: "Live Rooms", value: "24+" },
      { label: "Bluffs Called", value: "1.2K" },
      { label: "Fast Matchmaking", value: "< 10s" },
    ],
    [],
  );

  const requireAuth = () => {
    if (!user) {
      toast.error("Login to create or join a room.");
      navigate("/login");
      return false;
    }

    return true;
  };

  return (
    <main className="overflow-hidden px-4 py-12">
      <section className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950/35 px-6 py-10 backdrop-blur-xl lg:px-10 lg:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_26%)]" />
        {floatingCards.map((card, index) => (
          <motion.div
            key={`${card.rank}-${card.suit}`}
            className="card-shadow absolute hidden h-28 w-20 rounded-[1.35rem] border border-white/10 bg-white p-3 text-slate-900 lg:block"
            style={{ top: card.top, left: card.left, rotate: `${card.rotate}deg` }}
            animate={{ y: [0, -14, 0], rotate: [card.rotate, card.rotate + 2, card.rotate] }}
            transition={{ duration: 4 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-lg font-black">{card.rank}</p>
                <p className="text-base">{card.suit}</p>
              </div>
              <div className="text-center text-4xl opacity-80">{card.suit}</div>
              <div className="rotate-180 text-right">
                <p className="text-base">{card.suit}</p>
                <p className="text-lg font-black">{card.rank}</p>
              </div>
            </div>
          </motion.div>
        ))}

        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-200">
              <Sparkles size={16} />
              Premium real-time card table
            </div>
            <h1 className="mt-6 text-5xl font-black uppercase leading-none tracking-[0.18em] text-sky-300 sm:text-6xl lg:text-7xl">
              Bluff Royale
            </h1>
            <p className="mt-4 text-2xl font-semibold text-white">Play. Bluff. Challenge. Win.</p>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Step into a neon-lit multiplayer card room with hidden hands, dramatic bluff calls, timed turns, and a premium live-table feel across desktop and mobile.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="glass-panel rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                  <p className="text-3xl font-black text-white">{item.value}</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.25em] text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <button
                className="action-button-primary gap-2 rounded-full px-6"
                onClick={async () => {
                  if (!requireAuth()) {
                    return;
                  }

                  setAction("create");
                  try {
                    const nextRoom = await createRoom({ roomName: roomName || `${user.username}'s Arena`, maxPlayers });
                    navigate(`/lobby/${nextRoom.roomCode}`);
                  } catch (error) {
                    toast.error(error.response?.data?.message || "Unable to create room.");
                  } finally {
                    setAction(null);
                  }
                }}
              >
                <Plus size={18} />
                {action === "create" ? "Creating Room..." : "Create Room"}
              </button>
              <button className="action-button-secondary gap-2 rounded-full px-6" onClick={() => setShowRules((value) => !value)}>
                <ScrollText size={18} />
                Rules
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="space-y-5"
          >
            <div className="glass-panel rounded-[2rem] border border-white/10 bg-slate-950/50 p-6">
              <p className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-slate-400">
                <Users size={16} />
                Host a table
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">Create a room</h2>
              <div className="mt-5 space-y-4">
                <input className="input-field" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Room name" />
                <select className="input-field" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                  {[2, 3, 4, 5, 6].map((value) => (
                    <option key={value} value={value} className="bg-slate-900">
                      {value} players
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] border border-white/10 bg-slate-950/50 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Join instantly</p>
              <h2 className="mt-3 text-2xl font-bold text-white">Enter room code</h2>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  className="input-field text-center text-2xl font-black uppercase tracking-[0.3em]"
                  placeholder="ABCD12"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <button
                  className="action-button-primary gap-2"
                  onClick={async () => {
                    if (!requireAuth()) {
                      return;
                    }

                    setAction("join");
                    try {
                      const joinedRoom = await joinRoom(joinCode);
                      navigate(`/lobby/${joinedRoom.roomCode}`);
                    } catch (error) {
                      toast.error(error.response?.data?.message || "Unable to join room.");
                    } finally {
                      setAction(null);
                    }
                  }}
                >
                  {action === "join" ? "Joining..." : "Join Room"}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {showRules ? (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-8 max-w-7xl rounded-[2rem] border border-white/10 bg-slate-950/45 p-6 backdrop-blur-xl"
        >
          <h2 className="text-2xl font-bold text-white">Table Rules</h2>
          <div className="mt-5 grid gap-4 text-sm leading-7 text-slate-300 md:grid-cols-2">
            <p>The round starter chooses the claim rank. Everyone after that must keep claiming the same rank until the round resets.</p>
            <p>Only the active player can play or pass. Everyone else sees whose turn it is and waits for the move.</p>
            <p>Call bluff before continuing. If the last cards do not match the round claim, the liar takes the whole pile.</p>
            <p>If every player passes and the turn returns to the round starter, one more pass discards the pile and starts a fresh round.</p>
          </div>
        </motion.section>
      ) : null}
    </main>
  );
}
