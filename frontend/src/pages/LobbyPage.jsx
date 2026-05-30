import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, LoaderCircle, Sparkles } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import FullPageLoader from "../components/FullPageLoader";
import PlayerBadge from "../components/PlayerBadge";
import { useAuthStore } from "../store/authStore";
import { useRoomStore } from "../store/roomStore";
import { getSocket } from "../socket/socket";

export default function LobbyPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const room = useRoomStore((state) => state.room);
  const setRoom = useRoomStore((state) => state.setRoom);
  const fetchRoom = useRoomStore((state) => state.fetchRoom);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    fetchRoom(roomCode).catch(() => toast.error("Unable to load room."));
    socket?.emit("join-room", { roomCode });

    const onPlayers = (players) => {
      setRoom((currentRoom) => ({ ...currentRoom, players }));
      toast.success("Player joined the lobby.");
    };

    const onStarted = () => navigate(`/game/${roomCode}`);

    socket?.on("player-joined", onPlayers);
    socket?.on("start-game", onStarted);

    return () => {
      socket?.off("player-joined", onPlayers);
      socket?.off("start-game", onStarted);
    };
  }, [fetchRoom, navigate, roomCode, setRoom]);

  if (!room) {
    return <FullPageLoader label="Loading lobby..." />;
  }

  const isHost = room.hostId === user?.id;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[2.25rem] border border-white/10 bg-slate-950/50 p-7">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300">Room Code</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <h1 className="text-5xl font-black uppercase tracking-[0.15em] text-white">{room.roomCode}</h1>
            <button
              className="action-button-secondary gap-2"
              onClick={async () => {
                await navigator.clipboard.writeText(room.roomCode);
                toast.success("Room code copied.");
              }}
            >
              <Copy size={16} />
              Copy
            </button>
          </div>
          <p className="mt-4 text-lg text-slate-300">{room.name}</p>
          <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Table Status</p>
            <div className="mt-4 flex items-center gap-3 text-white">
              <LoaderCircle size={18} className="animate-spin text-sky-300" />
              Waiting for everyone to get comfortable at the table.
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass-panel rounded-[2.25rem] border border-white/10 bg-slate-950/50 p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-amber-300">
                <Sparkles size={16} />
                Lobby
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">Players Joined</h2>
            </div>
            {isHost ? (
              <button
                className="action-button-primary"
                disabled={starting}
                onClick={() => {
                  setStarting(true);
                  getSocket()?.emit("start-game", { roomCode }, (response) => {
                    setStarting(false);
                    if (!response.ok) {
                      toast.error(response.message);
                    }
                  });
                }}
              >
                {starting ? "Starting..." : "Start Game"}
              </button>
            ) : (
              <div className="rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
                Waiting for host to start
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4">
            {room.players.map((player) => (
              <PlayerBadge key={player.userId} player={{ ...player, connected: true }} isMe={player.userId === user?.id} />
            ))}
          </div>
        </motion.section>
      </div>
    </main>
  );
}
