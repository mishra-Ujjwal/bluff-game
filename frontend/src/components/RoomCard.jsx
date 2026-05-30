export default function RoomCard({ room }) {
  return (
    <div className="glass-panel rounded-[2rem] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-secondary">Room Code</p>
          <h3 className="mt-2 text-3xl font-black">{room.roomCode}</h3>
          <p className="mt-2 text-white/70">{room.name}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm">
          {room.players.length}/{room.maxPlayers}
        </span>
      </div>
    </div>
  );
}
