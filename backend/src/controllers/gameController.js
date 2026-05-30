import { prisma } from "../utils/prisma.js";

export const getGameHistory = async (req, res, next) => {
  try {
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { room: { hostId: req.user.id } },
          { room: { players: { some: { userId: req.user.id } } } },
        ],
      },
      include: {
        room: { select: { name: true, roomCode: true } },
        winner: { select: { id: true, username: true } },
        moves: { select: { id: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    const totalGames = games.length;
    const wins = games.filter((game) => game.winnerId === req.user.id).length;

    res.json({
      history: games.map((game) => ({
        id: game.id,
        roomName: game.room.name,
        roomCode: game.room.roomCode,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        winner: game.winner,
        moveCount: game.moves.length,
      })),
      stats: {
        gamesPlayed: totalGames,
        gamesWon: wins,
        winPercentage: totalGames ? Number(((wins / totalGames) * 100).toFixed(1)) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
