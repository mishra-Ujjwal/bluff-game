import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";

export default function HistoryPage() {
  const history = useGameStore((state) => state.history);
  const stats = useGameStore((state) => state.stats);
  const fetchHistory = useGameStore((state) => state.fetchHistory);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel rounded-[2rem] p-6">
          <p className="text-sm text-white/60">Games Played</p>
          <h2 className="mt-3 text-4xl font-black">{stats?.gamesPlayed ?? 0}</h2>
        </div>
        <div className="glass-panel rounded-[2rem] p-6">
          <p className="text-sm text-white/60">Games Won</p>
          <h2 className="mt-3 text-4xl font-black">{stats?.gamesWon ?? 0}</h2>
        </div>
        <div className="glass-panel rounded-[2rem] p-6">
          <p className="text-sm text-white/60">Win Percentage</p>
          <h2 className="mt-3 text-4xl font-black">{stats?.winPercentage ?? 0}%</h2>
        </div>
      </section>

      <section className="mt-8 glass-panel rounded-[2rem] p-6">
        <h1 className="text-3xl font-black">Match History</h1>
        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Winner</th>
                <th className="px-4 py-3">Moves</th>
              </tr>
            </thead>
            <tbody>
              {history.map((game) => (
                <tr key={game.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{game.roomName}</p>
                    <p className="text-white/55">{game.roomCode}</p>
                  </td>
                  <td className="px-4 py-3">{new Date(game.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{game.winner?.username || "No winner"}</td>
                  <td className="px-4 py-3">{game.moveCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
