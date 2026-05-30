import { create } from "zustand";
import api from "../services/api";
import { disconnectSocket, reconnectSocket } from "../socket/socket";
import { clearSessionToken, getStoredToken, persistSessionToken } from "../utils/session";

export const useAuthStore = create((set, get) => ({
  token: getStoredToken(),
  user: null,
  loading: false,
  async register(payload) {
    set({ loading: true });
    const { data } = await api.post("/auth/register", payload);
    persistSessionToken(data.token);
    reconnectSocket();
    set({ token: data.token, user: data.user, loading: false });
    return data.user;
  },
  async login(payload) {
    set({ loading: true });
    const { data } = await api.post("/auth/login", payload);
    persistSessionToken(data.token);
    reconnectSocket();
    set({ token: data.token, user: data.user, loading: false });
    return data.user;
  },
  async loadMe() {
    const token = getStoredToken();

    if (!token) {
      return;
    }

    set({ token, loading: true });
    try {
      const { data } = await api.get("/auth/me");
      persistSessionToken(token);
      reconnectSocket();
      set({ token, user: data.user, loading: false });
    } catch (_error) {
      get().logout();
    }
  },
  async logout() {
    try {
      await api.post("/auth/logout");
    } catch (_error) {
      // Clear the client session even if the backend is already unavailable.
    }

    clearSessionToken();
    disconnectSocket();
    set({ token: null, user: null, loading: false });
  },
}));
