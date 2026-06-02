import { RoomStatus } from "@prisma/client";
import { distributeCards, RANKS } from "../utils/cards.js";
import { AppError } from "../utils/errors.js";
import { prisma } from "../utils/prisma.js";

const TURN_TIME_LIMIT = 60;
const MAX_WINNERS = 3;

const sortHand = (hand) => hand.sort((left, right) => RANKS.indexOf(left.rank) - RANKS.indexOf(right.rank));

const cloneState = (state) => {
  if (state === undefined) {
    return null;
  }

  return JSON.parse(JSON.stringify(state));
};

const normalizeState = (state) => {
  if (!state) {
    return state;
  }

  state.players = (state.players || []).map((player) => ({
    ...player,
    hand: player.hand || [],
    connected: player.connected ?? true,
    stats: {
      cardsPlayed: player.stats?.cardsPlayed || 0,
      successfulBluffs: player.stats?.successfulBluffs || 0,
      wrongCalls: player.stats?.wrongCalls || 0,
    },
  }));

  state.currentPlayerId = state.currentPlayerId || state.currentTurnUserId || state.players[0]?.userId || null;
  state.currentTurnUserId = state.currentPlayerId;
  state.currentRoundRank = state.currentRoundRank ?? state.currentClaimRank ?? null;
  state.roundStarterPlayerId = state.roundStarterPlayerId || state.currentPlayerId || null;
  state.lastPlayedBy = state.lastPlayedBy ?? state.lastMove?.playerId ?? null;
  state.lastPlayedCards = state.lastPlayedCards ?? state.lastMove?.actualCards ?? [];
  state.lastPlayedClaimCount = state.lastPlayedClaimCount ?? state.lastMove?.count ?? 0;
  state.centerPile = state.centerPile ?? state.pile ?? [];
  state.discardPile = state.discardPile ?? [];
  state.consecutivePasses = state.consecutivePasses ?? 0;
  state.turnStartedAt = state.turnStartedAt || new Date().toISOString();
  state.turnTimeLimit = state.turnTimeLimit || TURN_TIME_LIMIT;
  state.deckCount = state.deckCount || 1;
  state.initialPlayerCount = state.initialPlayerCount || state.players.length;
  state.targetWinnerCount = state.targetWinnerCount || Math.max(1, Math.min(MAX_WINNERS, state.initialPlayerCount - 1));
  state.winners = state.winners || [];
  state.pendingWinnerId = state.pendingWinnerId ?? null;
  state.bluffReveal = state.bluffReveal ?? null;
  state.recentRoundEvent = state.recentRoundEvent ?? null;
  state.removedPlayerIds = state.removedPlayerIds || [];
  state.lastAction = state.lastAction || "Round restored.";
  state.startedAt = state.startedAt || new Date().toISOString();

  return state;
};

const getRemainingSeconds = (state) => {
  const startedAt = new Date(state.turnStartedAt).getTime();
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  return Math.max(0, (state.turnTimeLimit || TURN_TIME_LIMIT) - elapsed);
};

const sanitizePlayerForViewer = (player, viewerId) => ({
  userId: player.userId,
  username: player.username,
  cardsCount: player.hand.length,
  isHost: player.isHost,
  connected: player.connected,
  hasCards: player.hand.length > 0,
  stats: player.stats,
  hand: player.userId === viewerId ? player.hand : [],
});

export const activeGames = new Map();

export const serializeStateForUser = (state, viewerId) => ({
  roomCode: state.roomCode,
  roomName: state.roomName,
  status: state.status,
  hostId: state.hostId,
  currentPlayerId: state.currentPlayerId,
  currentTurnUserId: state.currentPlayerId,
  currentRoundRank: state.currentRoundRank,
  currentClaimRank: state.currentRoundRank,
  roundStarterPlayerId: state.roundStarterPlayerId,
  lastPlayedBy: state.lastPlayedBy,
  lastPlayedClaimCount: state.lastPlayedClaimCount || 0,
  lastAction: state.lastAction,
  centerPileCount: state.centerPile.reduce((total, entry) => total + (entry.cards?.length || 0), 0),
  pileCount: state.centerPile.reduce((total, entry) => total + (entry.cards?.length || 0), 0),
  discardPileCount: state.discardPile.length,
  consecutivePasses: state.consecutivePasses,
  turnStartedAt: state.turnStartedAt,
  turnTimeLimit: state.turnTimeLimit,
  deckCount: state.deckCount || 1,
  winners: state.winners || [],
  targetWinnerCount: state.targetWinnerCount || Math.max(1, Math.min(MAX_WINNERS, state.initialPlayerCount - 1)),
  remainingTurnSeconds: getRemainingSeconds(state),
  players: state.players.map((player) => sanitizePlayerForViewer(player, viewerId)),
  me: state.players.find((player) => player.userId === viewerId)
    ? sanitizePlayerForViewer(state.players.find((player) => player.userId === viewerId), viewerId)
    : null,
  winnerId: state.winnerId,
  pendingWinnerId: state.pendingWinnerId || null,
  bluffReveal: state.bluffReveal && state.bluffReveal.visibleToUserId === viewerId ? state.bluffReveal : null,
  recentRoundEvent: state.recentRoundEvent || null,
  startedAt: state.startedAt,
});

const persistPlayerCounts = async (roomId, state) => {
  await Promise.all(
    state.players.map((player) =>
      prisma.player.updateMany({
        where: { roomId, userId: player.userId },
        data: { cardsCount: player.hand.length },
      }),
    ),
  );
};

const getPlayerIndex = (state, userId) => state.players.findIndex((player) => player.userId === userId);

const getActivePlayers = (state) => state.players.filter((player) => player.hand.length > 0);

const getNextActivePlayerId = (state, currentUserId) => {
  const activePlayers = getActivePlayers(state);
  if (activePlayers.length <= 1) {
    return activePlayers[0]?.userId || null;
  }

  const startIndex = getPlayerIndex(state, currentUserId);
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const player = state.players[(startIndex + offset) % state.players.length];
    if (player.hand.length > 0) {
      return player.userId;
    }
  }

  return null;
};

const updateTurn = (state, nextPlayerId) => {
  state.currentPlayerId = nextPlayerId;
  state.currentTurnUserId = nextPlayerId;
  state.turnStartedAt = new Date().toISOString();
};

const syncHostAcrossState = (state, nextHostId) => {
  state.hostId = nextHostId;
  state.players = state.players.map((player) => ({
    ...player,
    isHost: player.userId === nextHostId,
  }));
};

const getPlayerOrThrow = (state, userId) => {
  const player = state.players.find((entry) => entry.userId === userId);
  if (!player) {
    throw new AppError("Unauthorized room access.", 403);
  }
  return player;
};

const resetRound = (state, nextStarterId, message, eventType = "round-ended") => {
  state.discardPile.push(...state.centerPile);
  state.centerPile = [];
  state.currentRoundRank = null;
  state.roundStarterPlayerId = nextStarterId;
  state.lastPlayedBy = null;
  state.lastPlayedCards = [];
  state.lastPlayedClaimCount = 0;
  state.consecutivePasses = 0;
  state.pendingWinnerId = null;
  state.bluffReveal = null;
  state.recentRoundEvent = {
    type: eventType,
    message,
    at: new Date().toISOString(),
    nextStarterId,
  };
  state.lastAction = message;
  updateTurn(state, nextStarterId);
};

const setWinner = (state, winnerId, message) => {
  state.winnerId = winnerId;
  state.pendingWinnerId = null;
  state.lastAction = message;
  state.recentRoundEvent = {
    type: "winner",
    message,
    at: new Date().toISOString(),
    winnerId,
  };
};

const finalizeWinningPlayer = (state, winnerId, nextStarterId, message) => {
  const winner = getPlayerOrThrow(state, winnerId);
  if (!state.winners.some((entry) => entry.userId === winner.userId)) {
    state.winners.push({
      userId: winner.userId,
      username: winner.username,
      finishedAt: new Date().toISOString(),
      place: state.winners.length + 1,
    });
  }

  state.removedPlayerIds = [...new Set([...(state.removedPlayerIds || []), winner.userId])];
  state.players = state.players.filter((player) => player.userId !== winner.userId);
  state.discardPile.push(...state.centerPile);
  state.centerPile = [];
  state.currentRoundRank = null;
  state.lastPlayedBy = null;
  state.lastPlayedCards = [];
  state.lastPlayedClaimCount = 0;
  state.consecutivePasses = 0;
  state.pendingWinnerId = null;
  state.bluffReveal = null;

  if (state.winners.length >= state.targetWinnerCount || getActivePlayers(state).length <= 1) {
    setWinner(state, winner.userId, `${winner.username} secured a winning spot and the match is complete.`);
    return;
  }

  state.roundStarterPlayerId = nextStarterId;
  state.recentRoundEvent = {
    type: "player-finished",
    message,
    at: new Date().toISOString(),
    winnerId: winner.userId,
    nextStarterId,
    removedPlayerId: winner.userId,
  };
  state.lastAction = message;
  updateTurn(state, nextStarterId);
};

const resolveAcceptedPendingWinner = (state, actorId) => {
  if (!state.pendingWinnerId || state.pendingWinnerId === actorId) {
    return false;
  }

  const winner = getPlayerOrThrow(state, state.pendingWinnerId);
  finalizeWinningPlayer(
    state,
    winner.userId,
    actorId,
    `${winner.username} finished their hand, leaves the table, and ${getPlayerOrThrow(state, actorId).username} starts the next round.`,
  );
  return true;
};

const updatePersistentGame = async (roomCode, state, lastMoveId = undefined) => {
  const room = await prisma.room.findUnique({
    where: { roomCode },
    select: { activeGameId: true, id: true },
  });

  if (!room?.activeGameId) {
    throw new AppError("Active game not found.", 404);
  }

  await prisma.game.update({
    where: { id: room.activeGameId },
    data: {
      state: cloneState(state),
      pile: cloneState(state.centerPile),
      currentTurnUserId: state.currentPlayerId,
      winnerId: state.winnerId,
      endedAt: state.winnerId ? new Date() : null,
      status: state.winnerId ? RoomStatus.FINISHED : RoomStatus.PLAYING,
      lastMoveId,
    },
  });

  await persistPlayerCounts(room.id, state);

  if (state.winnerId) {
    await prisma.room.update({
      where: { roomCode },
      data: { status: RoomStatus.FINISHED },
    });
  }
};

export const loadActiveGame = async (roomCode) => {
  if (activeGames.has(roomCode)) {
    return activeGames.get(roomCode);
  }

  const room = await prisma.room.findUnique({
    where: { roomCode },
    include: {
      activeGame: true,
    },
  });

  if (!room?.activeGame?.state) {
    return null;
  }

  const state = normalizeState(room.activeGame.state);
  activeGames.set(roomCode, state);
  return state;
};

export const createGameForRoom = async (room) => {
  if (room.players.length < 2) {
    throw new AppError("At least 2 players are required to start.");
  }

  const hands = distributeCards(room.players, room.deckCount || 1);
  const firstPlayerId = room.players[0].userId;
  const state = {
    roomId: room.id,
    roomCode: room.roomCode,
    roomName: room.name,
    hostId: room.hostId,
    status: RoomStatus.PLAYING,
    currentPlayerId: firstPlayerId,
    currentTurnUserId: firstPlayerId,
    currentRoundRank: null,
    roundStarterPlayerId: firstPlayerId,
    lastPlayedBy: null,
    lastPlayedCards: [],
    lastPlayedClaimCount: 0,
    centerPile: [],
    discardPile: [],
    consecutivePasses: 0,
    turnStartedAt: new Date().toISOString(),
    turnTimeLimit: TURN_TIME_LIMIT,
    deckCount: room.deckCount || 1,
    initialPlayerCount: room.players.length,
    targetWinnerCount: Math.max(1, Math.min(MAX_WINNERS, room.players.length - 1)),
    winners: [],
    removedPlayerIds: [],
    lastAction: `${room.players[0].user.username} starts a new round.`,
    winnerId: null,
    pendingWinnerId: null,
    bluffReveal: null,
    recentRoundEvent: null,
    startedAt: new Date().toISOString(),
    players: room.players.map((player) => ({
      userId: player.userId,
      username: player.user.username,
      isHost: player.userId === room.hostId,
      connected: true,
      hand: sortHand(hands[player.userId] || []),
      stats: {
        cardsPlayed: 0,
        successfulBluffs: 0,
        wrongCalls: 0,
      },
    })),
  };

  const game = await prisma.game.create({
    data: {
      roomId: room.id,
      state,
      pile: [],
      currentTurnUserId: state.currentPlayerId,
      status: RoomStatus.PLAYING,
    },
  });

  await prisma.room.update({
    where: { id: room.id },
    data: {
      status: RoomStatus.PLAYING,
      activeGameId: game.id,
    },
  });

  await persistPlayerCounts(room.id, state);
  activeGames.set(room.roomCode, state);
  return state;
};

export const ensureRoomJoinable = (room) => {
  if (!room) {
    throw new AppError("Room not found.", 404);
  }

  if (room.status !== RoomStatus.WAITING) {
    throw new AppError("Game already started.");
  }

  if (room.players.length >= room.maxPlayers) {
    throw new AppError("Room is full.");
  }
};

export const playCards = async ({ roomCode, userId, cards, claimedRank }) => {
  const state = await loadActiveGame(roomCode);

  if (!state) {
    throw new AppError("Active game not found.", 404);
  }

  if (state.currentPlayerId !== userId) {
    throw new AppError("It is not your turn.");
  }

  if (resolveAcceptedPendingWinner(state, userId)) {
    await updatePersistentGame(roomCode, state);
    return cloneState(state);
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new AppError("Select at least one card.");
  }

  const roundRank = state.currentRoundRank || claimedRank;
  if (!RANKS.includes(roundRank)) {
    throw new AppError("Invalid claimed rank.");
  }

  if (state.currentRoundRank && claimedRank !== state.currentRoundRank) {
    throw new AppError(`This round must continue as ${state.currentRoundRank}.`);
  }

  const player = getPlayerOrThrow(state, userId);
  const selectedCards = cards.map((cardId) => player.hand.find((card) => card.id === cardId));

  if (selectedCards.some((card) => !card)) {
    throw new AppError("One or more selected cards are invalid.");
  }

  player.hand = player.hand.filter((card) => !cards.includes(card.id));
  player.stats.cardsPlayed += selectedCards.length;

  state.currentRoundRank = roundRank;
  state.centerPile.push({
    playerId: userId,
    username: player.username,
    claimedRank: roundRank,
    cards: selectedCards,
  });
  state.lastPlayedBy = userId;
  state.lastPlayedCards = selectedCards;
  state.lastPlayedClaimCount = selectedCards.length;
  state.consecutivePasses = 0;
  state.pendingWinnerId = player.hand.length === 0 ? userId : null;
  state.bluffReveal = null;
  state.recentRoundEvent = null;
  state.lastAction = `${player.username} played ${selectedCards.length} card${selectedCards.length > 1 ? "s" : ""} as ${roundRank}.`;
  updateTurn(state, getNextActivePlayerId(state, userId));

  const room = await prisma.room.findUnique({
    where: { roomCode },
    select: { activeGameId: true },
  });

  const move = await prisma.gameMove.create({
    data: {
      gameId: room.activeGameId,
      playerId: userId,
      claimedRank: roundRank,
      actualCards: selectedCards,
    },
  });

  await updatePersistentGame(roomCode, state, move.id);
  return cloneState(state);
};

export const passTurn = async ({ roomCode, userId, reason = "manual" }) => {
  const state = await loadActiveGame(roomCode);

  if (!state) {
    throw new AppError("Active game not found.", 404);
  }

  if (state.currentPlayerId !== userId) {
    throw new AppError("It is not your turn.");
  }

  const player = getPlayerOrThrow(state, userId);

  if (resolveAcceptedPendingWinner(state, userId)) {
    await updatePersistentGame(roomCode, state);
    return cloneState(state);
  }

  const nextPlayerId = getNextActivePlayerId(state, userId);
  const nextPlayer = nextPlayerId ? getPlayerOrThrow(state, nextPlayerId) : null;

  if (!state.currentRoundRank) {
    if (reason !== "timeout") {
      throw new AppError("Round starter must play a card to begin the round.");
    }

    state.lastAction =
      reason === "timeout"
        ? `${player.username} ran out of time. ${nextPlayer?.username || "Next player"} starts a new round.`
        : `${player.username} passed. ${nextPlayer?.username || "Next player"} starts a new round.`;
    state.recentRoundEvent = {
      type: reason === "timeout" ? "auto-pass-timeout" : "pass-turn",
      message: state.lastAction,
      at: new Date().toISOString(),
      playerId: userId,
    };
    state.roundStarterPlayerId = nextPlayerId;
    updateTurn(state, nextPlayerId);
    await updatePersistentGame(roomCode, state);
    return cloneState(state);
  }

  state.consecutivePasses += 1;
  const activePlayersCount = getActivePlayers(state).length;

  if (state.roundStarterPlayerId === userId && state.consecutivePasses >= activePlayersCount) {
    const nextStarterId = getNextActivePlayerId(state, userId);
    const nextStarter = nextStarterId ? getPlayerOrThrow(state, nextStarterId) : null;
    resetRound(
      state,
      nextStarterId,
      `Pile discarded. ${nextStarter?.username || "Next player"} starts a fresh round.`,
      "pile-discarded",
    );
    await updatePersistentGame(roomCode, state);
    return cloneState(state);
  }

  state.lastAction =
    reason === "timeout"
      ? `${player.username} timed out and passed.`
      : `${player.username} passed.`;
  state.recentRoundEvent = {
    type: reason === "timeout" ? "auto-pass-timeout" : "pass-turn",
    message: state.lastAction,
    at: new Date().toISOString(),
    playerId: userId,
  };
  updateTurn(state, nextPlayerId);
  await updatePersistentGame(roomCode, state);
  return cloneState(state);
};

export const callBluff = async ({ roomCode, callerId }) => {
  const state = await loadActiveGame(roomCode);

  if (!state?.lastPlayedBy || !state.lastPlayedCards?.length) {
    throw new AppError("No move available to challenge.");
  }

  if (state.currentPlayerId !== callerId) {
    throw new AppError("Only the current player may call bluff.");
  }

  const lastPlayer = getPlayerOrThrow(state, state.lastPlayedBy);
  const caller = getPlayerOrThrow(state, callerId);
  const liar = state.lastPlayedCards.some((card) => card.rank !== state.currentRoundRank);
  const loser = liar ? lastPlayer : caller;
  const roundWinner = liar ? caller : lastPlayer;

  loser.hand.push(...state.centerPile.flatMap((entry) => entry.cards));
  sortHand(loser.hand);

  if (liar) {
    lastPlayer.stats.successfulBluffs += 1;
  } else {
    caller.stats.wrongCalls += 1;
  }

  state.bluffReveal = {
    claimedRank: state.currentRoundRank,
    actualCards: state.lastPlayedCards,
    liar,
    playerId: lastPlayer.userId,
    playerName: lastPlayer.username,
    callerId: caller.userId,
    callerName: caller.username,
    result: liar ? "Bluff Caught!" : "Wrong Call!",
    visibleToUserId: roundWinner.userId,
  };

  state.centerPile = [];
  state.currentRoundRank = null;
  state.lastPlayedBy = null;
  state.lastPlayedCards = [];
  state.lastPlayedClaimCount = 0;
  state.consecutivePasses = 0;
  state.pendingWinnerId = null;
  state.roundStarterPlayerId = roundWinner.userId;
  updateTurn(state, roundWinner.userId);
  state.lastAction = liar
    ? `${caller.username} caught ${lastPlayer.username}'s bluff. ${lastPlayer.username} takes the pile and ${caller.username} starts next.`
    : `${caller.username} called bluff on ${lastPlayer.username}, but ${lastPlayer.username} was truthful. ${caller.username} takes the pile and ${lastPlayer.username} starts next.`;
  state.recentRoundEvent = {
    type: "bluff-resolved",
    message: state.lastAction,
    at: new Date().toISOString(),
    loserId: loser.userId,
    winnerId: roundWinner.userId,
  };

  if (!liar && lastPlayer.hand.length === 0) {
    finalizeWinningPlayer(
      state,
      lastPlayer.userId,
      caller.userId,
      `${lastPlayer.username} finished their hand, leaves the table, and ${caller.username} starts the next round.`,
    );
  }

  await updatePersistentGame(roomCode, state);
  return cloneState(state);
};

export const markPlayerConnection = async (roomCode, userId, connected) => {
  const state = await loadActiveGame(roomCode);

  if (!state) {
    return null;
  }

  const player = state.players.find((entry) => entry.userId === userId);
  if (!player) {
    return state;
  }

  player.connected = connected;
  await updatePersistentGame(roomCode, state);
  return cloneState(state);
};

export const removePlayerFromRoom = async ({ roomCode, userId, reason = "left" }) => {
  const room = await prisma.room.findUnique({
    where: { roomCode },
    include: {
      players: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      activeGame: true,
    },
  });

  if (!room) {
    return { roomClosed: true, state: null, removedPlayerId: userId, roomStatus: null };
  }

  const membership = room.players.find((player) => player.userId === userId);
  if (!membership) {
    return { roomClosed: false, state: room.activeGame?.state ? await loadActiveGame(roomCode) : null, removedPlayerId: userId, roomStatus: room.status };
  }

  const remainingMembers = room.players.filter((player) => player.userId !== userId);
  const nextHostId = room.hostId === userId ? remainingMembers[0]?.userId || null : room.hostId;

  await prisma.player.deleteMany({
    where: { roomId: room.id, userId },
  });

  if (!remainingMembers.length) {
    activeGames.delete(roomCode);
    await prisma.room.delete({ where: { id: room.id } });
    return { roomClosed: true, state: null, removedPlayerId: userId, roomStatus: room.status };
  }

  await prisma.room.update({
    where: { id: room.id },
    data: { hostId: nextHostId || room.hostId },
  });

  if (!room.activeGame?.state) {
    return { roomClosed: false, state: null, removedPlayerId: userId, roomStatus: room.status };
  }

  const state = await loadActiveGame(roomCode);
  if (!state) {
    return { roomClosed: false, state: null, removedPlayerId: userId, roomStatus: room.status };
  }

  const removedPlayer = state.players.find((player) => player.userId === userId);
  if (!removedPlayer) {
    return { roomClosed: false, state: cloneState(state), removedPlayerId: userId, roomStatus: room.status };
  }

  const nextActivePlayerId = getNextActivePlayerId(state, userId);
  state.players = state.players.filter((player) => player.userId !== userId);
  state.removedPlayerIds = [...new Set([...(state.removedPlayerIds || []), userId])];
  syncHostAcrossState(state, nextHostId || state.hostId);

  state.centerPile = state.centerPile.filter((entry) => entry.playerId !== userId);
  if (state.lastPlayedBy === userId) {
    state.lastPlayedBy = null;
    state.lastPlayedCards = [];
    state.lastPlayedClaimCount = 0;
  }

  if (!state.centerPile.length) {
    state.currentRoundRank = null;
  }

  if (state.pendingWinnerId === userId) {
    state.pendingWinnerId = null;
  }

  if (state.roundStarterPlayerId === userId) {
    state.roundStarterPlayerId = nextActivePlayerId;
  }

  if (state.currentPlayerId === userId) {
    updateTurn(state, nextActivePlayerId);
  }

  const activePlayers = getActivePlayers(state);
  const removalLabel = reason === "offline" ? "went offline and was removed from the room." : "left the room.";

  if (activePlayers.length <= 1) {
    const survivor = activePlayers[0] || state.players[0];
    if (survivor) {
      setWinner(state, survivor.userId, `${removedPlayer.username} ${removalLabel} ${survivor.username} wins by default.`);
    }
  } else {
    state.recentRoundEvent = {
      type: "player-left",
      message: `${removedPlayer.username} ${removalLabel}`,
      at: new Date().toISOString(),
      removedPlayerId: userId,
      nextPlayerId: state.currentPlayerId,
    };
    state.lastAction = `${removedPlayer.username} ${removalLabel}`;
  }

  await updatePersistentGame(roomCode, state);
  return {
    roomClosed: false,
    state: cloneState(state),
    removedPlayerId: userId,
    roomStatus: room.status,
  };
};

export { TURN_TIME_LIMIT, getRemainingSeconds };
