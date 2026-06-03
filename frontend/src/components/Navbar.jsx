import { History, LogOut, UserRound } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Navbar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="border-b border-red-950/10 bg-[#f6f1eb]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-black tracking-[0.2em] text-red-950 sm:text-2xl">
          BLUFF
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          {user ? (
            <>
              <NavLink
                to="/history"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-full px-3 py-2 font-medium transition ${
                    isActive ? "bg-red-900 text-white" : "text-slate-700 hover:bg-white hover:text-slate-950"
                  }`
                }
              >
                <History size={16} />
                <span className="hidden sm:inline">History</span>
              </NavLink>
              <span className="inline-flex items-center gap-2 rounded-full border border-red-950/10 bg-white px-3 py-2 text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <UserRound size={16} className="text-red-800" />
                <span className="max-w-[7rem] truncate font-medium">{user.username}</span>
              </span>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="rounded-full px-3 py-2 font-medium text-slate-700 transition hover:bg-white hover:text-slate-950">
                Login
              </NavLink>
              <NavLink to="/register" className="inline-flex items-center rounded-full bg-red-900 px-4 py-2 font-semibold text-white transition hover:bg-red-800">
                Play Now
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
