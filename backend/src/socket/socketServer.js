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
  removePlayerFromRoom,
  serializeStateForUser,
} from "../services/gameService.js";

const turnMonitors = new Map();

const emitRoomSnapshot = (io, state) => {
  state.players.forEach((player) => {
    io.to(player.userId).emit("game-updated", serializeStateForUser(state, player.userId));
  });
};

const emitTimerSnapshot = (io, roomCode, state) => {
  io.to(roomCode).emit("timer-update", {
    roomCode,
    currentPlayerId: state.currentPlayerId,
    remainingSeconds: getRemainingSeconds(state),
    turnStartedAt: state.turnStartedAt,
    turnTimeLimit: state.turnTimeLimit,
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

  io.to(roomCode).emit("player-joined", {
    roomCode,
    players: room.players.map((player) => ({
      userId: player.user.id,
      username: player.user.username,
      cardsCount: player.cardsCount,
      isHost: player.user.id === room.hostId,
      connected: true,
    })),
    hostId: room.hostId,
  });
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
    io.to(roomCode).emit("clear-chat", { roomCode });
  }
};

const emitRoundEvents = (io, roomCode, state) => {
  if (!state.recentRoundEvent) {
    return;
  }

  if (state.recentRoundEvent.removedPlayerId) {
    io.in(state.recentRoundEvent.removedPlayerId).socketsLeave(roomCode);
    io.to(state.recentRoundEvent.removedPlayerId).emit("removed-from-room", {
      roomCode,
      message: state.recentRoundEvent.message,
    });
  }

  io.to(roomCode).emit(state.recentRoundEvent.type, {
    ...state.recentRoundEvent,
    roomCode,
  });
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

    emitTimerSnapshot(io, roomCode, state);

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

    socket.on("leave-room", async ({ roomCode }, callback) => {
      try {
        const normalizedRoomCode = roomCode?.trim();
        if (!normalizedRoomCode) {
          throw new Error("Room code is required.");
        }

        const result = await removePlayerFromRoom({
          roomCode: normalizedRoomCode,
          userId: user.userId,
          reason: "left",
        });

        io.in(user.userId).socketsLeave(normalizedRoomCode);
        socket.leave(normalizedRoomCode);

        if (!result.roomClosed) {
          await emitLobbySnapshot(io, normalizedRoomCode);
          if (result.state) {
            emitRoomSnapshot(io, result.state);
            emitTimerSnapshot(io, normalizedRoomCode, result.state);
            emitRoundEvents(io, normalizedRoomCode, result.state);
            emitWinnerIfNeeded(io, normalizedRoomCode, result.state);
            if (result.state.winnerId) {
              clearTurnMonitor(normalizedRoomCode);
            } else {
              scheduleTurnMonitor(io, normalizedRoomCode);
            }
          }
        } else {
          clearTurnMonitor(normalizedRoomCode);
        }

        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("remove-player", async ({ roomCode, targetUserId }, callback) => {
      try {
        const normalizedRoomCode = roomCode?.trim();
        const room = await prisma.room.findUnique({
          where: { roomCode: normalizedRoomCode },
          include: { players: true },
        });

        if (!room || room.hostId !== user.userId) {
          throw new Error("Only the host can remove players.");
        }

        if (room.status !== "WAITING") {
          throw new Error("Players can only be removed before the game starts.");
        }

        if (!targetUserId || targetUserId === room.hostId) {
          throw new Error("Invalid player removal request.");
        }

        await prisma.player.deleteMany({
          where: {
            roomId: room.id,
            userId: targetUserId,
          },
        });

        io.in(targetUserId).socketsLeave(normalizedRoomCode);
        io.to(targetUserId).emit("removed-from-room", {
          roomCode: normalizedRoomCode,
          message: "The host removed you from the room.",
        });
        await emitLobbySnapshot(io, normalizedRoomCode);
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
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
            deckCount: true,
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

        callback?.({ ok: true });
        io.to(normalizedRoomCode).emit("start-game", { roomCode: normalizedRoomCode });
        emitRoomSnapshot(io, state);
        emitTimerSnapshot(io, normalizedRoomCode, state);
        scheduleTurnMonitor(io, normalizedRoomCode);
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
        emitTimerSnapshot(io, payload.roomCode, state);
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
        emitTimerSnapshot(io, roomCode, state);
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
        emitTimerSnapshot(io, roomCode, state);
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
          roomCode,
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
        const result = await removePlayerFromRoom({
          roomCode: membership.room.roomCode,
          userId: user.userId,
          reason: "offline",
        });

        if (!result.roomClosed) {
          await emitLobbySnapshot(io, membership.room.roomCode);
          if (result.state) {
            emitRoomSnapshot(io, result.state);
            emitTimerSnapshot(io, membership.room.roomCode, result.state);
            emitRoundEvents(io, membership.room.roomCode, result.state);
            emitWinnerIfNeeded(io, membership.room.roomCode, result.state);
            if (result.state.winnerId) {
              clearTurnMonitor(membership.room.roomCode);
            } else {
              scheduleTurnMonitor(io, membership.room.roomCode);
            }
          }
        } else {
          clearTurnMonitor(membership.room.roomCode);
        }
      }
    });
  });
};
