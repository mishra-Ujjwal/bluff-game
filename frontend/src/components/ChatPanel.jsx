import { useState } from "react";
import { MessageCircleMore, SendHorizonal } from "lucide-react";

export default function ChatPanel({ messages, onSend, sending }) {
  const [message, setMessage] = useState("");

  return (
    <div className="glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/92 p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <MessageCircleMore size={18} className="text-sky-300" />
          Room Chat
        </h3>
      </div>
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto pr-2">
        {messages.map((entry) => (
          <div key={entry.id} className="rounded-2xl bg-slate-950/40 p-3">
            <p className="text-sm font-semibold text-secondary">{entry.username}</p>
            <p className="mt-1 text-sm text-white/80">{entry.message}</p>
          </div>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSend(message);
          setMessage("");
        }}
      >
        <input
          className="input-field"
          placeholder="Type your message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <button className="action-button-primary gap-2" type="submit" disabled={sending || !message.trim()}>
          <SendHorizonal size={16} />
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
