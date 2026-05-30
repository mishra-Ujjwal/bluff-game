import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Navbar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-black tracking-[0.25em] text-secondary">
          BLUFF ROYALE
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <NavLink to="/history" className="text-white/80 hover:text-white">
                History
              </NavLink>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                {user.username}
              </span>
              <button
                className="action-button-secondary"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="text-white/80 hover:text-white">
                Login
              </NavLink>
              <NavLink to="/register" className="action-button-primary">
                Play Now
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
