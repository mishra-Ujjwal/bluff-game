import { motion } from "framer-motion";

export default function FullPageLoader({ label = "Loading table..." }) {
  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel rounded-[2rem] px-8 py-10 text-center"
      >
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-sky-400/20 border-t-sky-400" />
        <p className="mt-5 text-sm uppercase tracking-[0.35em] text-slate-300">{label}</p>
      </motion.div>
    </main>
  );
}
