import { RoomStatus } from "@prisma/client";
import { z } from "zod";
import { ensureRoomJoinable, serializeStateForUser } from "../services/gameService.js";
import { generateRoomCode } from "../utils/roomCode.js";
import { prisma } from "../utils/prisma.js";
import { AppError } from "../utils/errors.js";

const createRoomSchema = z.object({
  roomName: z.string().min(3).max(40),
  maxPlayers: z.number().int().min(2).max(10),
  deckCount: z.number().int().min(1).max(2),
});

const joinRoomSchema = z.object({
  roomCode: z.string().trim().regex(/^\d{4,12}$/),
});

const leaveRoomSchema = z.object({
  roomCode: z.string().trim().regex(/^\d{4,12}$/),
});

const buildRoomResponse = (room, viewerId) => ({
  id: room.id,
  name: room.name,
  roomCode: room.roomCode,
  status: room.status,
  maxPlayers: room.maxPlayers,
  deckCount: room.deckCount,
  createdAt: room.createdAt,
  hostId: room.hostId,
  players: room.players.map((player) => ({
    userId: player.user.id,
    username: player.user.username,
    cardsCount: player.cardsCount,
    isHost: player.user.id === room.hostId,
    isMe: player.user.id === viewerId,
    joinedAt: player.joinedAt,
  })),
  activeGame: room.activeGame ? serializeStateForUser(room.activeGame.state, viewerId) : null,
});

export const createRoom = async (req, res, next) => {
  try {
    const data = createRoomSchema.parse(req.body);
    let roomCode = generateRoomCode();

    while (await prisma.room.findUnique({ where: { roomCode } })) {
      roomCode = generateRoomCode();
    }

    const room = await prisma.room.create({
      data: {
        name: data.roomName,
        roomCode,
        hostId: req.user.id,
        maxPlayers: data.maxPlayers,
        deckCount: data.deckCount,
        players: {
          create: {
            userId: req.user.id,
          },
        },
      },
      include: {
        players: { include: { user: { select: { id: true, username: true } } } },
      },
    });

    res.status(201).json({
      room: buildRoomResponse(room, req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

export const joinRoom = async (req, res, next) => {
  try {
    const data = joinRoomSchema.parse(req.body);
    const room = await prisma.room.findUnique({
      where: { roomCode: data.roomCode.trim() },
      include: {
        players: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { joinedAt: "asc" },
        },
        activeGame: true,
      },
    });

    if (room?.players.some((player) => player.userId === req.user.id)) {
      return res.json({ room: buildRoomResponse(room, req.user.id) });
    }

    ensureRoomJoinable(room);

    const updatedRoom = await prisma.room.update({
      where: { id: room.id },
      data: {
        players: {
          create: {
            userId: req.user.id,
          },
        },
      },
      include: {
        players: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { joinedAt: "asc" },
        },
        activeGame: true,
      },
    });

    res.json({ room: buildRoomResponse(updatedRoom, req.user.id) });
  } catch (error) {
    next(error);
  }
};

export const getRoomByCode = async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({
      where: { roomCode: req.params.roomCode.trim() },
      include: {
        players: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { joinedAt: "asc" },
        },
        activeGame: true,
      },
    });

    if (!room) {
      throw new AppError("Room not found.", 404);
    }

    if (!room.players.some((player) => player.userId === req.user.id) && room.status !== RoomStatus.WAITING) {
      throw new AppError("Unauthorized room access.", 403);
    }

    res.json({ room: buildRoomResponse(room, req.user.id) });
  } catch (error) {
    next(error);
  }
};

export const leaveRoom = async (req, res, next) => {
  try {
    const data = leaveRoomSchema.parse(req.body);
    const room = await prisma.room.findUnique({
      where: { roomCode: data.roomCode.trim() },
      include: {
        players: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { joinedAt: "asc" },
        },
        activeGame: true,
      },
    });

    if (!room) {
      throw new AppError("Room not found.", 404);
    }

    const membership = room.players.find((player) => player.userId === req.user.id);
    if (!membership) {
      return res.json({ ok: true });
    }

    await prisma.player.deleteMany({
      where: { roomId: room.id, userId: req.user.id },
    });

    const remainingPlayers = room.players.filter((player) => player.userId !== req.user.id);
    const nextHostId = room.hostId === req.user.id ? remainingPlayers[0]?.userId || null : room.hostId;

    if (!remainingPlayers.length) {
      await prisma.room.delete({ where: { id: room.id } });
      return res.json({ ok: true });
    }

    await prisma.room.update({
      where: { id: room.id },
      data: {
        hostId: nextHostId || room.hostId,
      },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};
