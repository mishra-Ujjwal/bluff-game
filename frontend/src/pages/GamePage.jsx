import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Clock3, Copy, DoorOpen, MessageCircleMore, ShieldAlert, Trophy, X } from "lucide-react";
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
  const selectedCards = useGameStore((state) => state.selectedCards);
  const claimedRank = useGameStore((state) => state.claimedRank);
  const timer = useGameStore((state) => state.timer);
  const reconnecting = useGameStore((state) => state.reconnecting);
  const toggleCard = useGameStore((state) => state.toggleCard);
  const clearSelection = useGameStore((state) => state.clearSelection);
  const setClaimedRank = useGameStore((state) => state.setClaimedRank);
  const setTimer = useGameStore((state) => state.setTimer);
  const setReconnecting = useGameStore((state) => state.setReconnecting);
  const [actionLoading, setActionLoading] = useState({});
  const [showChat, setShowChat] = useState(false);
  const [bluffModalOpen, setBluffModalOpen] = useState(false);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const lastRevealKeyRef = useRef(null);
  const lastWinnerRef = useRef(null);
  const timeoutToastShownRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    setReconnecting(socket ? !socket.connected : false);

    fetchRoom(roomCode)
      .then((room) => {
        if (room.activeGame) {
          setGame(room.activeGame);
          setTimer({
            remainingSeconds: room.activeGame.remainingTurnSeconds,
            currentPlayerId: room.activeGame.currentPlayerId,
            turnTimeLimit: room.activeGame.turnTimeLimit,
          });
        }
      })
      .catch(() => {
        toast.error("Unable to load game room.");
        navigate("/");
      });

    const onGameUpdated = (payload) => {
      if (payload?.players) {
        setGame(payload);
        if (payload.bluffReveal) {
          const revealKey = `${payload.bluffReveal.playerId}-${payload.bluffReveal.callerId}-${payload.bluffReveal.actualCards.length}`;
          if (lastRevealKeyRef.current !== revealKey) {
            lastRevealKeyRef.current = revealKey;
            setBluffModalOpen(true);
          }
        }
      }
    };

    const onTimerUpdate = (payload) => {
      setTimer(payload);
    };

    const onRoundEvent = (payload) => {
      if (payload?.message) {
        toast(payload.message);
      }
    };

    const onWinner = ({ winnerId }) => {
      if (lastWinnerRef.current === winnerId) {
        return;
      }

      lastWinnerRef.current = winnerId;
      setWinnerOpen(true);
      const winner = game?.players?.find((player) => player.userId === winnerId);
      toast.success(`${winner?.username || "A player"} wins the match!`);
    };

    const onSocketError = ({ message }) => toast.error(message);
    const onDisconnect = () => setReconnecting(true);
    const onConnect = () => setReconnecting(false);

    socket?.on("game-updated", onGameUpdated);
    socket?.on("receive-message", addChat);
    socket?.on("winner", onWinner);
    socket?.on("timer-update", onTimerUpdate);
    socket?.on("round-ended", onRoundEvent);
    socket?.on("pile-discarded", onRoundEvent);
    socket?.on("auto-pass-timeout", onRoundEvent);
    socket?.on("pass-turn", onRoundEvent);
    socket?.on("bluff-resolved", onRoundEvent);
    socket?.on("error-message", onSocketError);
    socket?.on("disconnect", onDisconnect);
    socket?.on("connect", onConnect);

    return () => {
      socket?.off("game-updated", onGameUpdated);
      socket?.off("receive-message", addChat);
      socket?.off("winner", onWinner);
      socket?.off("timer-update", onTimerUpdate);
      socket?.off("round-ended", onRoundEvent);
      socket?.off("pile-discarded", onRoundEvent);
      socket?.off("auto-pass-timeout", onRoundEvent);
      socket?.off("pass-turn", onRoundEvent);
      socket?.off("bluff-resolved", onRoundEvent);
      socket?.off("error-message", onSocketError);
      socket?.off("disconnect", onDisconnect);
      socket?.off("connect", onConnect);
    };
  }, [addChat, fetchRoom, game?.players, navigate, roomCode, setGame, setReconnecting, setTimer]);

  useEffect(() => {
    if (timer.remainingSeconds <= 0 && !timeoutToastShownRef.current) {
      timeoutToastShownRef.current = true;
      toast.error("Time over! Auto pass.");
    }

    if (timer.remainingSeconds > 0) {
      timeoutToastShownRef.current = false;
    }
  }, [timer.remainingSeconds]);

  const topPlayers = game ? game.players.filter((player) => player.userId !== user?.id) : [];

  if (!game) {
    return <FullPageLoader label="Reconnecting to the match..." />;
  }

  const me = game.me;
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
    <main className="h-dvh w-full overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 lg:overflow-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[1600px] min-w-0 flex-col gap-3 lg:h-full">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 lg:hidden">
          <button
            className="action-button-secondary gap-2 border border-red-400/20 text-red-200"
            onClick={() => {
              if (window.confirm("Are you sure you want to leave this game table?")) {
                navigate("/");
              }
            }}
          >
            <DoorOpen size={16} />
            Exit
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-slate-950/55 px-2 text-center text-xs font-semibold text-white">
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

        <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-1 lg:hidden">
          {topPlayers.map((player) => (
            <div key={player.userId} className="min-w-[220px] shrink-0">
              <PlayerBadge
                player={player}
                isTurn={player.userId === game.currentPlayerId}
                isMe={player.userId === user?.id}
                compact
              />
            </div>
          ))}
        </div>

        <div className="hidden lg:flex lg:items-start lg:justify-between lg:gap-3">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              className="action-button-secondary gap-2 border border-red-400/20 text-red-200"
              onClick={() => {
                if (window.confirm("Are you sure you want to leave this game table?")) {
                  navigate("/");
                }
              }}
            >
              <DoorOpen size={16} />
              Exit
            </button>
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:mx-4 lg:max-w-[760px]">
            {topPlayers.map((player) => (
              <PlayerBadge
                key={player.userId}
                player={player}
                isTurn={player.userId === game.currentPlayerId}
                isMe={player.userId === user?.id}
                compact
              />
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

      <div className="relative min-h-0 flex-1">
        <section className="flex min-h-0 flex-col gap-3 lg:h-full lg:overflow-hidden">
         

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="table-felt relative h-[240px] shrink-0 overflow-hidden rounded-[2rem] border px-3 py-3 sm:h-[280px] sm:px-4 sm:py-4 lg:h-[360px] lg:px-5 lg:py-5 xl:h-[390px]"
          >
            <div className="absolute left-4 top-4">
              <GameTimer remainingSeconds={timer.remainingSeconds} totalSeconds={timer.turnTimeLimit || 120} />
            </div>

            <div className="absolute right-3 top-3 max-w-[10rem] rounded-[1rem] border border-amber-400/25 bg-slate-950/45 p-2.5 sm:right-4 sm:top-4 sm:max-w-[13rem] sm:rounded-[1.25rem] sm:p-3 lg:max-w-[15rem]">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Table Status</p>
              <p className="mt-2 text-sm font-semibold text-white lg:text-base">
                {isMyTurn ? "It is your turn" : `Waiting for ${currentPlayer?.username || "the next player"}`}
              </p>
              <p className="mt-2 text-xs text-slate-300 lg:text-sm">
                Current Claim: <span className="font-bold text-sky-300">{game.currentRoundRank || "Choose a rank"}</span>
              </p>
              <p className="mt-2 line-clamp-3 text-xs text-slate-400 lg:line-clamp-4 lg:text-sm">{game.lastAction}</p>
            </div>

            <div className="mx-auto mt-10 flex h-full max-w-xs flex-col items-center justify-center sm:max-w-sm lg:mt-8 lg:max-w-md">
              <motion.div
                key={game.centerPileCount}
                initial={{ scale: 0.95, opacity: 0.85 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative flex h-24 w-36 items-center justify-center rounded-[2rem] border border-amber-300/45 bg-slate-950/35 px-3 sm:h-28 sm:w-44 lg:h-44 lg:w-72 lg:rounded-[2.25rem]"
              >
                <div className="absolute inset-4 rounded-[50%] border border-white/10" />
                <div className="relative">
                  <div className="mb-4 flex justify-center">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="-ml-6 first:ml-0">
                        <PlayingCard faceDown card={{ id: `back-${index}` }} index={index} />
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-xs uppercase tracking-[0.35em] text-slate-300 sm:text-sm">Pile</p>
                  <p className="mt-1 text-center text-xl font-black text-white sm:text-2xl lg:text-3xl">{game.centerPileCount} cards</p>
                  <p className="mt-2 text-center text-[11px] text-slate-300 sm:text-xs lg:text-sm">
                    {game.currentRoundRank ? `Current Claim: ${game.currentRoundRank}` : "Fresh round waiting for a claim"}
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="grid gap-3 lg:hidden sm:grid-cols-2"
          >
            <div className="glass-panel rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-3">
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
                className="action-button-primary mt-3 w-full justify-center"
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

            <div className="glass-panel rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-3">
              <button
                className="action-button-secondary w-full justify-center"
                disabled={!isMyTurn || (isNewRound && isRoundStarter) || !!actionLoading.pass}
                onClick={() => runAction("pass", (done) => getSocket()?.emit("pass-turn", { roomCode }, done))}
              >
                {actionLoading.pass ? "Passing..." : controlsLockedForWinnerAcceptance ? "Accept Win" : "Pass"}
              </button>
              <button
                className="action-button-secondary mt-3 w-full justify-center border border-red-400/25 text-red-200"
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
            className="glass-panel flex min-h-[260px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/50 p-3 sm:min-h-[300px] sm:p-4 lg:min-h-0 lg:h-full"
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

            <div className="mt-3 flex min-h-[8rem] flex-1 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.4),rgba(15,23,42,0.2))] px-2 py-2 lg:min-h-0">
              <div className="scrollbar-thin flex h-full min-h-[8rem] w-full items-end overflow-x-auto overflow-y-hidden pb-1 sm:min-h-[10.5rem] lg:min-h-0">
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
        className="fixed bottom-5 right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-950/88 text-center text-xs font-semibold text-white shadow-2xl sm:h-20 sm:w-20 sm:text-sm"
        onClick={() => setShowChat((value) => !value)}
      >
        {showChat ? "Hide chat" : "Show chat"}
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
