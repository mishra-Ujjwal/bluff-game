import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Clock3, Copy, DoorOpen, MessageCircleMore, ShieldAlert, Trophy, UserMinus, UserRound, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import ChatPanel from "../components/ChatPanel";
import FullPageLoader from "../components/FullPageLoader";
import GameTimer from "../components/GameTimer";
import PlayerBadge from "../components/PlayerBadge";
import PlayingCard from "../components/PlayingCard";
import { getSocket } from "../socket/socket";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { useRoomStore } from "../store/roomStore";
import { RANKS } from "../utils/constants";

function WinnerModal({ open, winner, onClose }) {
  return (
    <AnimatePresence>
      {open && winner ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            className="glass-panel max-w-lg rounded-[2rem] border border-amber-300/30 bg-slate-950/75 p-8 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
              <Trophy size={38} />
            </div>
            <h2 className="mt-5 text-4xl font-black text-white">{winner.username} wins!</h2>
            <p className="mt-3 text-slate-300">The table is cleared. Time to celebrate the read, the bluff, and the finish.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-black text-white">{winner.stats?.cardsPlayed ?? 0}</p>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Cards Played</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-black text-white">{winner.stats?.successfulBluffs ?? 0}</p>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Bluffs</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-black text-white">{winner.stats?.wrongCalls ?? 0}</p>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Wrong Calls</p>
              </div>
            </div>
            <button className="action-button-primary mt-6 w-full" onClick={onClose}>
              Keep Watching
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function BluffModal({ reveal, open, onClose }) {
  return (
    <AnimatePresence>
      {open && reveal ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 30 }}
            className="glass-panel max-w-2xl rounded-[2rem] border border-red-400/25 bg-slate-950/80 p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-red-300" />
              <div>
                <h2 className="text-3xl font-black text-white">{reveal.result}</h2>
                <p className="mt-1 text-slate-300">
                  Claimed rank: <span className="font-semibold text-sky-300">{reveal.claimedRank}</span>
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {reveal.actualCards.map((card, index) => (
                <PlayingCard key={card.id} card={card} faceDown={false} index={index} />
              ))}
            </div>
            <p className="mt-5 text-sm text-slate-300">
              {reveal.playerName} played {reveal.actualCards.length} card{reveal.actualCards.length > 1 ? "s" : ""}.{" "}
              {reveal.liar ? `${reveal.callerName} caught the bluff.` : `${reveal.callerName} made the wrong call.`}
            </p>
            <button className="action-button-primary mt-6" onClick={onClose}>
              Close Reveal
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function GamePage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const fetchRoom = useRoomStore((state) => state.fetchRoom);
  const game = useGameStore((state) => state.game);
  const setGame = useGameStore((state) => state.setGame);
  const chat = useGameStore((state) => state.chat);
  const addChat = useGameStore((state) => state.addChat);
  const resetChat = useGameStore((state) => state.resetChat);
  const selectedCards = useGameStore((state) => state.selectedCards);
  const claimedRank = useGameStore((state) => state.claimedRank);
  const timer = useGameStore((state) => state.timer);
  const reconnecting = useGameStore((state) => state.reconnecting);
  const toggleCard = useGameStore((state) => state.toggleCard);
  const clearSelection = useGameStore((state) => state.clearSelection);
  const setClaimedRank = useGameStore((state) => state.setClaimedRank);
  const setTimer = useGameStore((state) => state.setTimer);
  const setReconnecting = useGameStore((state) => state.setReconnecting);
  const resetGameState = useGameStore((state) => state.resetGameState);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const [actionLoading, setActionLoading] = useState({});
  const [showChat, setShowChat] = useState(false);
  const [bluffModalOpen, setBluffModalOpen] = useState(false);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const lastRevealKeyRef = useRef(null);
  const lastWinnerRef = useRef(null);
  const timeoutToastShownRef = useRef(false);
  const swipeStartRef = useRef(null);
  const allowExitRef = useRef(false);
  const showChatRef = useRef(false);

  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  useEffect(() => {
    const socket = getSocket();
    setReconnecting(socket ? !socket.connected : false);
    resetGameState();

    fetchRoom(roomCode)
      .then((room) => {
        if (room.activeGame) {
          setGame(room.activeGame);
          setTimer({
            remainingSeconds: room.activeGame.remainingTurnSeconds,
            currentPlayerId: room.activeGame.currentPlayerId,
            turnTimeLimit: room.activeGame.turnTimeLimit,
            mode: room.activeGame.reconnectGrace ? "reconnect" : "turn",
            reconnectGrace: room.activeGame.reconnectGrace || null,
          });
        }
      })
      .catch(() => {
        toast.error("Unable to load game room.");
        navigate("/");
      });

    const onGameUpdated = (payload) => {
      if (!payload?.players || payload.roomCode !== roomCode) {
        return;
      }

      setGame(payload);
      setTimer({
        remainingSeconds: payload.remainingTurnSeconds,
        currentPlayerId: payload.currentPlayerId,
        turnTimeLimit: payload.turnTimeLimit,
        mode: payload.reconnectGrace ? "reconnect" : "turn",
        reconnectGrace: payload.reconnectGrace || null,
      });
      if (payload.bluffReveal) {
        const revealKey = `${payload.bluffReveal.playerId}-${payload.bluffReveal.callerId}-${payload.bluffReveal.actualCards.length}`;
        if (lastRevealKeyRef.current !== revealKey) {
          lastRevealKeyRef.current = revealKey;
          setBluffModalOpen(true);
        }
      }
    };

    const onReceiveMessage = (payload) => {
      if (!payload || payload.roomCode !== roomCode) {
        return;
      }

      addChat(payload);
      if (!showChatRef.current && payload?.userId !== user?.id) {
        setUnreadChatCount((count) => count + 1);
      }
    };

    const onTimerUpdate = (payload) => {
      if (!payload || payload.roomCode !== roomCode) {
        return;
      }

      setTimer(payload);
    };

    const onRoundEvent = (payload) => {
      if (!payload || payload.roomCode !== roomCode) {
        return;
      }

      if (payload?.message) {
        toast(payload.message);
      }
    };

    const onClearChat = (payload) => {
      if (payload?.roomCode && payload.roomCode !== roomCode) {
        return;
      }

      resetChat();
      setUnreadChatCount(0);
    };

    const onRemoved = ({ roomCode: removedRoomCode, message }) => {
      if (removedRoomCode !== roomCode) {
        return;
      }

      allowExitRef.current = true;
      resetGameState();
      toast.error(message || "You were removed from the room.");
      navigate("/");
    };

    const onWinner = ({ roomCode: winnerRoomCode, winnerId }) => {
      if (winnerRoomCode !== roomCode) {
        return;
      }

      if (lastWinnerRef.current === winnerId) {
        return;
      }

      lastWinnerRef.current = winnerId;
      setWinnerOpen(true);
      const winner = useGameStore.getState().game?.players?.find((player) => player.userId === winnerId);
      toast.success(`${winner?.username || "A player"} wins the match!`);
    };

    const onSocketError = ({ message }) => toast.error(message);
    const onDisconnect = () => setReconnecting(true);
    const onConnect = () => setReconnecting(false);

    socket?.on("game-updated", onGameUpdated);
    socket?.on("receive-message", onReceiveMessage);
    socket?.on("winner", onWinner);
    socket?.on("timer-update", onTimerUpdate);
    socket?.on("round-ended", onRoundEvent);
    socket?.on("pile-discarded", onRoundEvent);
    socket?.on("auto-pass-timeout", onRoundEvent);
    socket?.on("pass-turn", onRoundEvent);
    socket?.on("bluff-resolved", onRoundEvent);
    socket?.on("clear-chat", onClearChat);
    socket?.on("removed-from-room", onRemoved);
    socket?.on("error-message", onSocketError);
    socket?.on("disconnect", onDisconnect);
    socket?.on("connect", onConnect);

    return () => {
      socket?.off("game-updated", onGameUpdated);
      socket?.off("receive-message", onReceiveMessage);
      socket?.off("winner", onWinner);
      socket?.off("timer-update", onTimerUpdate);
      socket?.off("round-ended", onRoundEvent);
      socket?.off("pile-discarded", onRoundEvent);
      socket?.off("auto-pass-timeout", onRoundEvent);
      socket?.off("pass-turn", onRoundEvent);
      socket?.off("bluff-resolved", onRoundEvent);
      socket?.off("clear-chat", onClearChat);
      socket?.off("removed-from-room", onRemoved);
      socket?.off("error-message", onSocketError);
      socket?.off("disconnect", onDisconnect);
      socket?.off("connect", onConnect);
      resetGameState();
    };
  }, [addChat, fetchRoom, navigate, resetChat, resetGameState, roomCode, setGame, setReconnecting, setTimer, user?.id]);

  useEffect(() => {
    if (showChat) {
      setUnreadChatCount(0);
    }
  }, [showChat]);

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

  const topPlayers = game ? game.players.filter((player) => player.userId !== user?.id) : [];

  if (!game) {
    return <FullPageLoader label="Reconnecting to the match..." />;
  }

  const me = game.me;
  const isHost = game.hostId === user?.id;
  const isMyTurn = game.currentPlayerId === user?.id;
  const isNewRound = !game.currentRoundRank;
  const isRoundStarter = game.roundStarterPlayerId === user?.id;
  const canCallBluff = isMyTurn && !!game.lastPlayedBy && game.lastPlayedBy !== user?.id;
  const canPlay = isMyTurn && (!game.pendingWinnerId || game.pendingWinnerId === user?.id);
  const controlsLockedForWinnerAcceptance = isMyTurn && game.pendingWinnerId && game.pendingWinnerId !== user?.id;
  const effectiveClaimRank = game.currentRoundRank || claimedRank;
  const currentPlayer = game.players.find((player) => player.userId === game.currentPlayerId);
  const currentPlayerLabel = currentPlayer?.username || "Waiting";
  const winner = game.players.find((player) => player.userId === game.winnerId);
  const handDisabled = !canPlay || !!game.winnerId || controlsLockedForWinnerAcceptance;
  const displayedRemainingSeconds = timer.currentPlayerId === game.currentPlayerId ? timer.remainingSeconds : 0;
  const timerLabel = timer.mode === "reconnect" ? "Rejoin" : "Turn";

  const handleLeaveRoom = () => {
    if (!window.confirm("Are you sure you want to leave this game table?")) {
      return;
    }

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
        // Socket cleanup already completed.
      }

      resetGameState();
      navigate("/");
    });
  };

  const handleRemovePlayer = (targetUserId, username) => {
    if (!isHost || !targetUserId) {
      return;
    }

    if (!window.confirm(`Remove ${username} from this room?`)) {
      return;
    }

    getSocket()?.emit("remove-player", { roomCode, targetUserId }, (response) => {
      if (!response?.ok) {
        toast.error(response?.message || "Unable to remove player.");
        return;
      }

      toast.success(`${username} removed from room.`);
    });
  };

  const runAction = (key, emitter) => {
    setActionLoading((current) => ({ ...current, [key]: true }));
    emitter((response) => {
      setActionLoading((current) => ({ ...current, [key]: false }));
      if (!response.ok) {
        toast.error(response.message);
        return;
      }

      if (key === "play") {
        clearSelection();
      }
    });
  };

  return (
    <main
      className="h-dvh w-full overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4"
      onTouchStart={(event) => {
        const touch = event.changedTouches?.[0];
        if (!touch) {
          return;
        }

        swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        const touch = event.changedTouches?.[0];
        const start = swipeStartRef.current;

        if (!touch || !start) {
          return;
        }

        const deltaX = touch.clientX - start.x;
        const deltaY = Math.abs(touch.clientY - start.y);

        if (start.x <= 28 && deltaX > 90 && deltaY < 70) {
          toast.error("Use the Exit button to leave the room.");
        }

        swipeStartRef.current = null;
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-[1600px] min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 lg:hidden">
          <button
            className="action-button-secondary gap-2 border border-red-400/20 text-red-200"
            onClick={handleLeaveRoom}
          >
            <DoorOpen size={16} />
            Exit
          </button>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-400/15 text-sky-300">
                <UserRound size={16} />
              </span>
              <span className="max-w-[5.5rem] truncate text-xs font-semibold">{user?.username || "Guest"}</span>
            </div>
            <button
              className="action-button-secondary gap-2"
              onClick={async () => {
                await navigator.clipboard.writeText(game.roomCode);
                toast.success("Room code copied.");
              }}
            >
              <Copy size={16} />
              {game.roomCode}
            </button>
          </div>
        </div>

        <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-1 lg:hidden">
          {topPlayers.map((player) => (
            <div key={player.userId} className="relative min-w-[220px] shrink-0">
              <PlayerBadge
                player={player}
                isTurn={player.userId === game.currentPlayerId}
                isMe={player.userId === user?.id}
                compact
              />
              {isHost ? (
                <button
                  className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-slate-950/85 px-2.5 py-1 text-[10px] font-semibold text-red-200 transition hover:bg-red-950/70"
                  onClick={() => handleRemovePlayer(player.userId, player.username)}
                >
                  <UserMinus size={12} />
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="hidden lg:flex lg:items-start lg:justify-between lg:gap-3">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              className="action-button-secondary gap-2 border border-red-400/20 text-red-200"
              onClick={handleLeaveRoom}
            >
              <DoorOpen size={16} />
              Exit
            </button>
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:mx-4 lg:max-w-[760px]">
            {topPlayers.map((player) => (
              <div key={player.userId} className="relative">
                <PlayerBadge
                  player={player}
                  isTurn={player.userId === game.currentPlayerId}
                  isMe={player.userId === user?.id}
                  compact
                />
                {isHost ? (
                  <button
                    className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-slate-950/85 px-2.5 py-1 text-[10px] font-semibold text-red-200 transition hover:bg-red-950/70"
                    onClick={() => handleRemovePlayer(player.userId, player.username)}
                  >
                    <UserMinus size={12} />
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-slate-950/55 px-3 text-center text-sm font-semibold text-white lg:h-24 lg:w-24 lg:text-base">
              {user?.username || "Guest"}
            </div>
            <button
              className="action-button-secondary gap-2"
              onClick={async () => {
                await navigator.clipboard.writeText(game.roomCode);
                toast.success("Room code copied.");
              }}
            >
              <Copy size={16} />
              {game.roomCode}
            </button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 p-2">
        <section className="flex min-h-0 flex-col gap-3">
         

          <motion.section
  initial={{ opacity: 0, y: 18 }}
  animate={{ opacity: 1, y: 0 }}
  className="table-felt relative h-[300px] shrink-0 overflow-hidden rounded-[2rem] border px-3 py-3 sm:h-[330px] sm:px-4 sm:py-4 lg:h-[390px] lg:px-5 lg:py-5 xl:h-[420px]"
>
  {isMyTurn ? (
    <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-sky-300/35 bg-sky-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.22)]">
      Your Turn
    </div>
  ) : null}

  <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
    <GameTimer
      remainingSeconds={displayedRemainingSeconds}
      totalSeconds={timer.turnTimeLimit || 60}
      label={timerLabel}
    />
  </div>

  <div className="mx-auto flex h-full max-w-xs flex-col items-center justify-center pt-10 sm:max-w-sm lg:max-w-md lg:pt-6">
    {game.currentRoundRank ? (
      <p className="mb-4 rounded-full border border-sky-300/40 bg-sky-400/15 px-4 py-1.5 text-sm font-extrabold text-sky-200 sm:text-base lg:text-lg">
        Current Claim: {game.currentRoundRank}
      </p>
    ) : null}

    <motion.div
      key={game.centerPileCount}
      initial={{ scale: 0.95, opacity: 0.85 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative flex h-24 w-36 items-center justify-center rounded-[2rem] border border-amber-300/45 bg-slate-950/35 px-3 sm:h-28 sm:w-44 lg:h-44 lg:w-72 lg:rounded-[2.25rem]"
    >
      <div className="absolute inset-4 rounded-[50%] border border-white/10" />

      <div className="relative">
        <p className="text-center text-sm uppercase tracking-[0.35em] text-slate-300 sm:text-base">
          Pile
        </p>

        <p className="mt-1 text-center text-2xl font-black text-white sm:text-3xl lg:text-4xl">
          {game.centerPileCount} cards
        </p>
      </div>
    </motion.div>

    <div className="mt-4 w-full max-w-[20rem] px-2 text-center sm:max-w-[24rem] lg:max-w-[28rem]">
      <p className="break-words text-sm font-semibold leading-6 text-slate-200 sm:text-base lg:text-lg">
        {game.lastAction}
      </p>
    </div>
  </div>
</motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="lg:hidden"
          >
            <div className="scrollbar-thin flex gap-2 overflow-x-auto rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-3">
              <div className="min-w-[5.5rem] shrink-0">
                <select
                  className="input-field"
                  value={effectiveClaimRank}
                  disabled={!isMyTurn || !isNewRound || controlsLockedForWinnerAcceptance}
                  onChange={(event) => setClaimedRank(event.target.value)}
                >
                  {RANKS.map((rank) => (
                    <option key={rank} value={rank} className="bg-slate-900">
                      {rank}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="action-button-primary min-w-[8rem] shrink-0 justify-center"
                disabled={handDisabled || selectedCards.length === 0 || !!actionLoading.play}
                onClick={() =>
                  runAction("play", (done) =>
                    getSocket()?.emit("play-cards", { roomCode, cards: selectedCards, claimedRank: effectiveClaimRank }, done),
                  )
                }
              >
                {actionLoading.play ? "Playing..." : "Play Cards"}
              </button>
              <button
                className="action-button-secondary min-w-[6rem] shrink-0 justify-center"
                disabled={!isMyTurn || (isNewRound && isRoundStarter) || !!actionLoading.pass}
                onClick={() => runAction("pass", (done) => getSocket()?.emit("pass-turn", { roomCode }, done))}
              >
                {actionLoading.pass ? "Passing..." : controlsLockedForWinnerAcceptance ? "Accept Win" : "Pass"}
              </button>
              <button
                className="action-button-secondary min-w-[7.5rem] shrink-0 justify-center border border-red-400/25 text-red-200"
                disabled={!canCallBluff || !!actionLoading.bluff}
                onClick={() => runAction("bluff", (done) => getSocket()?.emit("call-bluff", { roomCode }, done))}
              >
                <AlertTriangle size={16} className="mr-2" />
                {actionLoading.bluff ? "Calling..." : "Call Bluff"}
              </button>
            </div>
          </motion.section>

          <div className="flex min-h-0 flex-col gap-3 lg:grid lg:flex-1 lg:grid-cols-[minmax(0,1fr)_260px]">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`glass-panel flex min-h-[260px] flex-col overflow-hidden rounded-[2rem] border bg-slate-950/50 p-3 sm:min-h-[300px] sm:p-4 ${
              isMyTurn
                ? "border-sky-300/60 shadow-[0_0_30px_rgba(56,189,248,0.18)]"
                : "border-white/10"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Cards Left</p>
                <h3 className="mt-1 text-xl font-black text-white">{me?.hand?.length ?? 0}</h3>
                <p className="mt-1 max-w-2xl text-sm text-slate-300">
                  {controlsLockedForWinnerAcceptance
                    ? "The previous player emptied their hand. Call bluff now or pass to confirm the win."
                    : isMyTurn
                      ? "Choose cards and make your move."
                      : `Waiting for ${currentPlayer?.username || "another player"}`}
                </p>
              </div>
            </div>

            <div className={`mt-3 flex min-h-[8rem] flex-1 rounded-[1.5rem] border bg-[linear-gradient(180deg,rgba(15,23,42,0.4),rgba(15,23,42,0.2))] px-2 py-2 ${
              isMyTurn ? "border-sky-300/40" : "border-white/10"
            }`}>
              <div className="scrollbar-thin flex h-full min-h-[8rem] w-full items-end overflow-x-auto overflow-y-hidden pb-1 sm:min-h-[10.5rem]">
                {me?.hand?.length ? (
                  me.hand.map((card, index) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      active={selectedCards.includes(card.id)}
                      disabled={handDisabled}
                      index={index}
                      onClick={() => {
                        if (!handDisabled) {
                          toggleCard(card.id);
                        }
                      }}
                    />
                  ))
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-400">
                    No cards in hand
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="hidden lg:flex lg:h-full lg:flex-col lg:justify-end lg:gap-4"
          >
            <div className="glass-panel rounded-[2rem] border border-white/10 bg-slate-950/55 p-4">
              <div className="min-w-[7rem]">
                <select
                  className="input-field"
                  value={effectiveClaimRank}
                  disabled={!isMyTurn || !isNewRound || controlsLockedForWinnerAcceptance}
                  onChange={(event) => setClaimedRank(event.target.value)}
                >
                  {RANKS.map((rank) => (
                    <option key={rank} value={rank} className="bg-slate-900">
                      {rank}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="action-button-primary mt-4 w-full justify-center"
                disabled={handDisabled || selectedCards.length === 0 || !!actionLoading.play}
                onClick={() =>
                  runAction("play", (done) =>
                    getSocket()?.emit("play-cards", { roomCode, cards: selectedCards, claimedRank: effectiveClaimRank }, done),
                  )
                }
              >
                {actionLoading.play ? "Playing..." : "Play Cards"}
              </button>
            </div>

            <div className="glass-panel rounded-[2rem] border border-white/10 bg-slate-950/55 p-4">
              <button
                className="action-button-secondary w-full justify-center"
                disabled={!isMyTurn || (isNewRound && isRoundStarter) || !!actionLoading.pass}
                onClick={() => runAction("pass", (done) => getSocket()?.emit("pass-turn", { roomCode }, done))}
              >
                {actionLoading.pass ? "Passing..." : controlsLockedForWinnerAcceptance ? "Accept Win" : "Pass"}
              </button>
              <button
                className="action-button-secondary mt-4 w-full justify-center border border-red-400/25 text-red-200"
                disabled={!canCallBluff || !!actionLoading.bluff}
                onClick={() => runAction("bluff", (done) => getSocket()?.emit("call-bluff", { roomCode }, done))}
              >
                <AlertTriangle size={16} className="mr-2" />
                {actionLoading.bluff ? "Calling..." : "Call Bluff"}
              </button>
            </div>
          </motion.aside>
          </div>

          {/* <div className="-mt-1">
            <PlayerBadge player={me} isTurn={isMyTurn} isMe compact />
          </div> */}
        </section>

        <AnimatePresence>
          {showChat ? (
            <motion.div
              initial={{ opacity: 0, x: 20, y: -8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20, y: -8 }}
              className="absolute bottom-20 right-0 top-auto z-30 h-[min(72vh,520px)] w-full max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[2rem] sm:max-w-[380px] lg:bottom-0 lg:max-w-[360px]"
            >
              <div className="absolute right-4 top-4 z-10">
                <button className="action-button-secondary p-2" onClick={() => setShowChat(false)}>
                  <X size={16} />
                </button>
              </div>
              <ChatPanel
                messages={chat}
                sending={!!actionLoading.chat}
                onSend={(message) =>
                  runAction("chat", (done) =>
                    getSocket()?.emit("send-message", { roomCode, message }, done),
                  )
                }
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      </div>

      <button
        className="fixed bottom-5 right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-950/88 text-center text-[11px] font-semibold text-white shadow-2xl sm:h-20 sm:w-20 sm:text-sm"
        onClick={() => setShowChat((value) => !value)}
      >
        <div className="relative flex flex-col items-center gap-1">
          <MessageCircleMore size={18} />
          <span>{showChat ? "Hide" : "Chat"}</span>
          {!showChat && unreadChatCount > 0 ? (
            <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unreadChatCount > 9 ? "9+" : unreadChatCount}
            </span>
          ) : null}
        </div>
      </button>

      <AnimatePresence>
        {reconnecting ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
          >
            <div className="glass-panel rounded-[2rem] px-6 py-5 text-center">
              <Clock3 className="mx-auto text-sky-300" />
              <p className="mt-3 text-lg font-semibold text-white">Reconnecting to the table...</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <BluffModal open={bluffModalOpen} reveal={game.bluffReveal} onClose={() => setBluffModalOpen(false)} />
      <WinnerModal open={winnerOpen} winner={winner} onClose={() => setWinnerOpen(false)} />
    </main>
  );
}
