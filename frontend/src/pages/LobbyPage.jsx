import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Copy, DoorOpen, LoaderCircle, Sparkles, UserMinus } from "lucide-react";
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
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const [starting, setStarting] = useState(false);
  const allowExitRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    fetchRoom(roomCode)
      .then((loadedRoom) => {
        if (loadedRoom?.activeGame) {
          navigate(`/game/${roomCode}`);
        }
      })
      .catch(() => toast.error("Unable to load room."));
    socket?.emit("join-room", { roomCode });

    const onPlayers = (payload) => {
      if (!payload || payload.roomCode !== roomCode) {
        return;
      }

      setRoom((currentRoom) => ({ ...currentRoom, players: payload.players, hostId: payload.hostId ?? currentRoom?.hostId }));
    };

    const onStarted = () => navigate(`/game/${roomCode}`);
    const onRemoved = ({ message }) => {
      allowExitRef.current = true;
      toast.error(message || "You were removed from the room.");
      navigate("/");
    };

    socket?.on("player-joined", onPlayers);
    socket?.on("start-game", onStarted);
    socket?.on("removed-from-room", onRemoved);

    return () => {
      socket?.off("player-joined", onPlayers);
      socket?.off("start-game", onStarted);
      socket?.off("removed-from-room", onRemoved);
    };
  }, [fetchRoom, navigate, roomCode, setRoom]);

  useEffect(() => {
    const preventUnload = (event) => {
      if (allowExitRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      if (allowExitRef.current) {
        return;
      }

      window.history.pushState(null, "", window.location.href);
      toast.error("Use the Exit button to leave the room.");
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", preventUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", preventUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (!room) {
    return <FullPageLoader label="Loading lobby..." />;
  }

  const isHost = room.hostId === user?.id;

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-3 py-4 sm:px-4 sm:py-6 lg:px-4 lg:py-10">
      <div className="grid min-h-[calc(100dvh-2rem)] gap-4 lg:min-h-0 lg:gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-[1.75rem] border border-white/10 bg-slate-950/50 p-5 sm:rounded-[2rem] sm:p-6 lg:rounded-[2.25rem] lg:p-7"
        >
          <p className="text-xs uppercase tracking-[0.32em] text-sky-300 sm:text-sm sm:tracking-[0.35em]">Room Code</p>
          <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4">
            <h1 className="text-4xl font-black uppercase tracking-[0.12em] text-white sm:text-5xl sm:tracking-[0.15em]">{room.roomCode}</h1>
            <div className="flex items-center gap-2">
              <button
                className="action-button-secondary gap-2 px-3 py-2 text-sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(room.roomCode);
                  toast.success("Room code copied.");
                }}
              >
                <Copy size={16} />
                Copy
              </button>
              <button
                className="action-button-secondary gap-2 border border-red-400/20 px-3 py-2 text-sm text-red-200"
                onClick={() => {
                  allowExitRef.current = true;
                  getSocket()?.emit("leave-room", { roomCode }, async (response) => {
                    if (!response?.ok) {
                      toast.error(response?.message || "Unable to leave room.");
                      allowExitRef.current = false;
                      return;
                    }

                    try {
                      await leaveRoom(roomCode);
                    } catch (_error) {
                      // Socket cleanup already handled the actual exit.
                    }

                    navigate("/");
                  });
                }}
              >
                <DoorOpen size={16} />
                Exit
              </button>
            </div>
          </div>
          <p className="mt-3 text-base text-slate-300 sm:mt-4 sm:text-lg">{room.name}</p>
          <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/5 p-4 sm:mt-8 sm:rounded-[1.75rem] sm:p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400 sm:text-sm sm:tracking-[0.3em]">Table Status</p>
            <div className="mt-3 flex items-center gap-3 text-sm text-white sm:mt-4 sm:text-base">
              <LoaderCircle size={18} className="animate-spin text-sky-300" />
              Waiting for everyone to get comfortable at the table.
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass-panel flex min-h-0 flex-col rounded-[1.75rem] border border-white/10 bg-slate-950/50 p-5 sm:rounded-[2rem] sm:p-6 lg:rounded-[2.25rem] lg:p-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-amber-300 sm:text-sm sm:tracking-[0.3em]">
                <Sparkles size={16} />
                Lobby
              </p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Players Joined</h2>
            </div>
            {isHost ? (
              <button
                className="action-button-primary w-full justify-center sm:w-auto"
                disabled={starting}
                onClick={() => {
                  setStarting(true);
                  const resetHandle = window.setTimeout(() => {
                    setStarting(false);
                    toast.error("Start game is taking too long. Please try again.");
                  }, 10000);

                  getSocket()?.emit("start-game", { roomCode }, (response) => {
                    window.clearTimeout(resetHandle);
                    setStarting(false);
                    if (!response.ok) {
                      toast.error(response.message);
                      return;
                    }

                    navigate(`/game/${roomCode}`);
                  });
                }}
              >
                {starting ? "Starting..." : "Start Game"}
              </button>
            ) : (
              <div className="w-full rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-center text-sm text-sky-200 sm:w-auto">
                Waiting for host to start
              </div>
            )}
          </div>

          <div className="scrollbar-thin mt-5 grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1 sm:mt-6 sm:gap-4">
            {room.players.map((player) => (
              <div key={player.userId} className="relative">
                <PlayerBadge player={{ ...player, connected: true }} isMe={player.userId === user?.id} />
                {isHost && player.userId !== user?.id ? (
                  <button
                    className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-950/70"
                    onClick={() => {
                      getSocket()?.emit("remove-player", { roomCode, targetUserId: player.userId }, async (response) => {
                        if (!response?.ok) {
                          toast.error(response?.message || "Unable to remove player.");
                          return;
                        }

                        await fetchRoom(roomCode);
                        toast.success(`${player.username} removed from room.`);
                      });
                    }}
                  >
                    <UserMinus size={14} />
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </main>
  );
}
