import { prisma } from "../utils/prisma.js";
import { verifyToken } from "../utils/jwt.js";
import {
  callBluff,
  createGameForRoom,
  getRemainingSeconds,
  loadActiveGame,
  markPlayerConnection,
  passTurn,
  playCards,
  serializeStateForUser,
} from "../services/gameService.js";

const turnMonitors = new Map();

const emitRoomSnapshot = (io, state) => {
  state.players.forEach((player) => {
    io.to(player.userId).emit("game-updated", serializeStateForUser(state, player.userId));
  });
};

const emitLobbySnapshot = async (io, roomCode) => {
  const room = await prisma.room.findUnique({
    where: { roomCode },
    include: {
      players: {
        include: { user: { select: { id: true, username: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!room) {
    return;
  }

  io.to(roomCode).emit(
    "player-joined",
    room.players.map((player) => ({
      userId: player.user.id,
      username: player.user.username,
      cardsCount: player.cardsCount,
      isHost: player.user.id === room.hostId,
      connected: true,
    })),
  );
};

const getSocketUser = (socket) => socket.data.user;

const ensureSocketMembership = async (roomCode, userId) => {
  const room = await prisma.room.findUnique({
    where: { roomCode },
    include: { players: true },
  });

  if (!room || !room.players.some((player) => player.userId === userId)) {
    throw new Error("Unauthorized room access.");
  }

  return room;
};

const emitWinnerIfNeeded = (io, roomCode, state) => {
  if (state.winnerId) {
    io.to(roomCode).emit("winner", { winnerId: state.winnerId });
  }
};

const emitRoundEvents = (io, roomCode, state) => {
  if (!state.recentRoundEvent) {
    return;
  }

  io.to(roomCode).emit(state.recentRoundEvent.type, state.recentRoundEvent);
};

const clearTurnMonitor = (roomCode) => {
  const existing = turnMonitors.get(roomCode);
  if (existing) {
    clearInterval(existing);
    turnMonitors.delete(roomCode);
  }
};

const scheduleTurnMonitor = (io, roomCode) => {
  clearTurnMonitor(roomCode);

  const interval = setInterval(async () => {
    const state = await loadActiveGame(roomCode);
    if (!state) {
      clearTurnMonitor(roomCode);
      return;
    }

    io.to(roomCode).emit("timer-update", {
      roomCode,
      currentPlayerId: state.currentPlayerId,
      remainingSeconds: getRemainingSeconds(state),
      turnStartedAt: state.turnStartedAt,
      turnTimeLimit: state.turnTimeLimit,
    });

    if (state.winnerId) {
      clearTurnMonitor(roomCode);
      return;
    }

    if (getRemainingSeconds(state) > 0) {
      return;
    }

    try {
      const nextState = await passTurn({
        roomCode,
        userId: state.currentPlayerId,
        reason: "timeout",
      });
      io.to(roomCode).emit("auto-pass-timeout", {
        roomCode,
        playerId: state.currentPlayerId,
        message: `${state.players.find((player) => player.userId === state.currentPlayerId)?.username || "Player"} timed out.`,
      });
      emitRoundEvents(io, roomCode, nextState);
      emitRoomSnapshot(io, nextState);
      emitWinnerIfNeeded(io, roomCode, nextState);
      scheduleTurnMonitor(io, roomCode);
    } catch (_error) {
      clearTurnMonitor(roomCode);
    }
  }, 1000);

  turnMonitors.set(roomCode, interval);
};

export const configureSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = verifyToken(token);
      next();
    } catch (_error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const user = getSocketUser(socket);
    socket.join(user.userId);

    const roomMemberships = await prisma.player.findMany({
      where: { userId: user.userId },
      include: { room: true },
    });

    for (const membership of roomMemberships) {
      socket.join(membership.room.roomCode);
      const state = await loadActiveGame(membership.room.roomCode);
      if (state) {
        await markPlayerConnection(membership.room.roomCode, user.userId, true);
        socket.emit("game-updated", serializeStateForUser(state, user.userId));
        socket.emit("timer-update", {
          roomCode: membership.room.roomCode,
          currentPlayerId: state.currentPlayerId,
          remainingSeconds: getRemainingSeconds(state),
          turnStartedAt: state.turnStartedAt,
          turnTimeLimit: state.turnTimeLimit,
        });
      }
    }

    socket.on("create-room", async ({ roomCode }) => {
      if (!roomCode) {
        return;
      }

      try {
        await ensureSocketMembership(roomCode, user.userId);
        socket.join(roomCode);
        await emitLobbySnapshot(io, roomCode);
      } catch (_error) {
        socket.emit("error-message", { message: "Unauthorized room access." });
      }
    });

    socket.on("join-room", async ({ roomCode }) => {
      if (!roomCode) {
        return;
      }

      try {
        await ensureSocketMembership(roomCode, user.userId);
        socket.join(roomCode);
        await emitLobbySnapshot(io, roomCode);
      } catch (_error) {
        socket.emit("error-message", { message: "Unauthorized room access." });
      }
    });

    socket.on("start-game", async ({ roomCode }, callback) => {
      try {
        const normalizedRoomCode = roomCode?.toUpperCase();
        const room = await prisma.room.findUnique({
          where: { roomCode: normalizedRoomCode },
          select: {
            id: true,
            name: true,
            roomCode: true,
            hostId: true,
            status: true,
            maxPlayers: true,
          },
        });

        if (!room || room.hostId !== user.userId) {
          throw new Error("Only the host can start the game.");
        }

        const players = await prisma.player.findMany({
          where: { roomId: room.id },
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        });

        if (players.length < 2) {
          throw new Error(`At least 2 players are required to start. Current players: ${players.length}.`);
        }

        const state = await createGameForRoom({
          ...room,
          players,
        });
        io.to(normalizedRoomCode).emit("start-game", { roomCode: normalizedRoomCode });
        emitRoomSnapshot(io, state);
        scheduleTurnMonitor(io, normalizedRoomCode);
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("play-cards", async (payload, callback) => {
      try {
        const state = await playCards({
          roomCode: payload.roomCode,
          userId: user.userId,
          cards: payload.cards,
          claimedRank: payload.claimedRank,
        });

        emitRoomSnapshot(io, state);
        emitRoundEvents(io, payload.roomCode, state);
        emitWinnerIfNeeded(io, payload.roomCode, state);
        scheduleTurnMonitor(io, payload.roomCode);
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("pass-turn", async ({ roomCode }, callback) => {
      try {
        const state = await passTurn({
          roomCode,
          userId: user.userId,
          reason: "manual",
        });
        emitRoomSnapshot(io, state);
        emitRoundEvents(io, roomCode, state);
        emitWinnerIfNeeded(io, roomCode, state);
        scheduleTurnMonitor(io, roomCode);
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("call-bluff", async ({ roomCode }, callback) => {
      try {
        const state = await callBluff({ roomCode, callerId: user.userId });
        emitRoomSnapshot(io, state);
        emitRoundEvents(io, roomCode, state);
        emitWinnerIfNeeded(io, roomCode, state);
        scheduleTurnMonitor(io, roomCode);
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("send-message", async ({ roomCode, message }, callback) => {
      try {
        if (!roomCode || !message?.trim()) {
          throw new Error("Message cannot be empty.");
        }

        const room = await prisma.room.findUnique({
          where: { roomCode },
          include: { players: true },
        });

        if (!room || !room.players.some((player) => player.userId === user.userId)) {
          throw new Error("Unauthorized room access.");
        }

        io.to(roomCode).emit("receive-message", {
          id: crypto.randomUUID(),
          userId: user.userId,
          username: user.username,
          message: message.trim(),
          createdAt: new Date().toISOString(),
        });

        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("disconnect", async () => {
      const disconnectMemberships = await prisma.player.findMany({
        where: { userId: user.userId },
        include: { room: true },
      });

      for (const membership of disconnectMemberships) {
        await markPlayerConnection(membership.room.roomCode, user.userId, false);
        const state = await loadActiveGame(membership.room.roomCode);
        if (state) {
          emitRoomSnapshot(io, state);
        }
      }
    });
  });
};
