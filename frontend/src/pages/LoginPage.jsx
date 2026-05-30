import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/AuthCard";
import { useAuthStore } from "../store/authStore";

function ShowcaseCards() {
  return (
    <div className="relative hidden min-h-[520px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.88),rgba(7,17,31,0.98))] p-8 lg:block">
      {[
        { rank: "A", suit: "♠", rotate: -16, left: "12%", top: "18%" },
        { rank: "K", suit: "♥", rotate: 9, left: "56%", top: "12%" },
        { rank: "Q", suit: "♦", rotate: -8, left: "26%", top: "48%" },
      ].map((card, index) => (
        <motion.div
          key={`${card.rank}-${card.suit}`}
          className="card-shadow absolute h-40 w-28 rounded-[1.65rem] bg-white p-4 text-slate-900"
          style={{ left: card.left, top: card.top, rotate: `${card.rotate}deg` }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="text-2xl font-black">{card.rank}</p>
              <p className="text-xl">{card.suit}</p>
            </div>
            <p className="text-center text-6xl">{card.suit}</p>
            <div className="rotate-180 text-right">
              <p className="text-xl">{card.suit}</p>
              <p className="text-2xl font-black">{card.rank}</p>
            </div>
          </div>
        </motion.div>
      ))}
      <div className="absolute bottom-8 left-8 max-w-sm">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300">Bluff Royale</p>
        <h2 className="mt-3 text-4xl font-black text-white">Read the table. Time the bluff. Control the pile.</h2>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <ShowcaseCards />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center">
          <AuthCard title="Welcome back" subtitle="Reconnect to your room and slide straight back into the action.">
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setLoading(true);
                try {
                  await login(form);
                  toast.success("Logged in successfully.");
                  navigate(location.state?.from?.pathname || "/");
                } catch (error) {
                  toast.error(error.response?.data?.message || "Login failed.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <input className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input
                className="input-field"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button className="action-button-primary w-full" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>
            <p className="mt-4 text-sm text-white/65">
              Need an account?{" "}
              <Link to="/register" className="text-secondary">
                Register
              </Link>
            </p>
          </AuthCard>
        </motion.div>
      </div>
    </main>
  );
}
