export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/45 p-8">
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mt-2 text-sm text-white/65">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
