import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Plus, ScrollText, Sparkles, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import { useRoomStore } from "../store/roomStore";

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const createRoom = useRoomStore((state) => state.createRoom);
  const joinRoom = useRoomStore((state) => state.joinRoom);
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [deckCount, setDeckCount] = useState(1);
  const [joinCode, setJoinCode] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
    <main className="overflow-hidden w-full bg-[#f6f1eb] px-2 py-10 text-slate-950">
      <section className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] border border-red-950/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,241,235,0.92))] px-6 py-10 shadow-[0_30px_90px_rgba(20,10,10,0.12)] lg:px-10 lg:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(127,29,29,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(17,24,39,0.08),transparent_25%)]" />

        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-900/15 bg-red-950 px-4 py-2 text-sm font-medium text-red-100">
              <Sparkles size={16} />
              Premium real-time card table
            </div>
            <h1 className="mt-6 text-5xl font-black uppercase leading-none tracking-[0.18em] text-red-900 sm:text-6xl lg:text-7xl">
              Bluff
            </h1>
            <p className="mt-4 text-2xl font-semibold text-slate-950">Play. Bluff. Challenge. Win.</p>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Step into a premium multiplayer card room with hidden hands, dramatic bluff calls, timed turns, and a crisp red-black table personality across desktop and mobile.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-[1.75rem] border border-red-950/10 bg-white/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-3xl font-black text-red-950">{item.value}</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.25em] text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-full bg-red-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(127,29,29,0.28)] transition hover:bg-red-800"
                onClick={() => {
                  if (!requireAuth()) {
                    return;
                  }

                  setShowCreateModal(true);
                }}
              >
                <Plus size={18} />
                Create Room
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                onClick={() => setShowRules((value) => !value)}
              >
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
            <div className="rounded-[2rem] border border-red-950/10 bg-white/85 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
              <p className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-slate-500">
                <Users size={16} />
                Host a table
              </p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">Create a room</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Start a private table with your preferred player count and deck setup. We’ll ask for the room details after you click create.
              </p>
              <button
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={() => {
                  if (!requireAuth()) {
                    return;
                  }

                  setShowCreateModal(true);
                }}
              >
                <Plus size={16} />
                Open Create Room
              </button>
            </div>

            <div className="rounded-[2rem] border border-red-950/10 bg-slate-950 p-6 shadow-[0_28px_70px_rgba(20,10,10,0.18)]">
              <p className="text-sm uppercase tracking-[0.3em] text-red-200/80">Join instantly</p>
              <h2 className="mt-3 text-2xl font-bold text-white">Enter room code</h2>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  className="input-field bg-white text-center text-2xl font-black uppercase tracking-[0.3em] text-slate-950"
                  placeholder="123456"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 12))}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
                  onClick={async () => {
                    if (!requireAuth()) {
                      return;
                    }

                    setAction("join");
                    try {
                      const joinedRoom = await joinRoom(joinCode);
                      navigate(`/lobby/${joinedRoom.roomCode}`);
                    } catch (error) {
                      toast.error( "Unable to join room."|| error.response?.data?.message || "Unable to join room.");
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
          className="mx-auto mt-8 max-w-7xl rounded-[2rem] border border-red-950/10 bg-white/85 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)]"
        >
          <h2 className="text-2xl font-bold text-slate-950">Table Rules</h2>
          <div className="mt-5 grid gap-4 text-sm leading-7 text-slate-700 md:grid-cols-2">
            <p>The round starter chooses the claim rank. Everyone after that must keep claiming the same rank until the round resets.</p>
            <p>Only the active player can play or pass. Everyone else sees whose turn it is and waits for the move.</p>
            <p>Call bluff before continuing. If the last cards do not match the round claim, the liar takes the whole pile.</p>
            <p>If every player passes and the turn returns to the round starter, one more pass discards the pile and starts a fresh round.</p>
          </div>
        </motion.section>
      ) : null}

      <AnimatePresence>
        {showCreateModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              className="w-full max-w-lg rounded-[2rem] border border-red-950/10 bg-[#fcfaf7] p-6 shadow-[0_30px_90px_rgba(20,10,10,0.22)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Create Room</p>
                  <h2 className="mt-2 text-3xl font-black text-red-950">Set up your table</h2>
                </div>
                <button
                  className="rounded-full border border-slate-900/10 p-2 text-slate-600 transition hover:bg-slate-100"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <input
                  className="input-field bg-white text-slate-950"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Room name"
                />
                <select className="input-field bg-white text-slate-950" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <option key={value} value={value} className="bg-white text-slate-950">
                      {value} players
                    </option>
                  ))}
                </select>
                <select className="input-field bg-white text-slate-950" value={deckCount} onChange={(e) => setDeckCount(Number(e.target.value))}>
                  {[1, 2].map((value) => (
                    <option key={value} value={value} className="bg-white text-slate-950">
                      {value} deck{value > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-900/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
                  onClick={async () => {
                    if (!requireAuth()) {
                      return;
                    }

                    setAction("create");
                    try {
                      const nextRoom = await createRoom({
                        roomName: roomName || `${user.username}'s Arena`,
                        maxPlayers,
                        deckCount,
                      });
                      setShowCreateModal(false);
                      navigate(`/lobby/${nextRoom.roomCode}`);
                    } catch (error) {
                      toast.error(error.response?.data?.message || "Unable to create room.");
                    } finally {
                      setAction(null);
                    }
                  }}
                >
                  <Plus size={16} />
                  {action === "create" ? "Creating Room..." : "Create Room"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
