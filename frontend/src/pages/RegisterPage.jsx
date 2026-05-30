import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/AuthCard";
import { useAuthStore } from "../store/authStore";

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.9),rgba(7,17,31,0.98))] p-8 lg:block">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Join the table</p>
          <h2 className="mt-3 text-4xl font-black text-white">Create your alias and start hosting dramatic rounds.</h2>
          <div className="mt-8 grid gap-4">
            {["Private hand visibility", "Timed turns with bluff pressure", "Live room chat and stats"].map((item) => (
              <div key={item} className="glass-panel rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center">
          <AuthCard title="Create your alias" subtitle="Set up your profile and start hosting live rooms in seconds.">
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setLoading(true);
                try {
                  await register(form);
                  toast.success("Account created.");
                  navigate("/");
                } catch (error) {
                  toast.error(error.response?.data?.message || "Registration failed.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <input className="input-field" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <input className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input
                className="input-field"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button className="action-button-primary w-full" type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Register"}
              </button>
            </form>
            <p className="mt-4 text-sm text-white/65">
              Already have an account?{" "}
              <Link to="/login" className="text-secondary">
                Login
              </Link>
            </p>
          </AuthCard>
        </motion.div>
      </div>
    </main>
  );
}
