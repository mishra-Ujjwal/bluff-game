import { create } from "zustand";
import api from "../services/api";

export const useRoomStore = create((set) => ({
  room: null,
  loading: false,
  async createRoom(payload) {
    set({ loading: true });
    const { data } = await api.post("/rooms/create", payload);
    set({ room: data.room, loading: false });
    return data.room;
  },
  async joinRoom(roomCode) {
    set({ loading: true });
    const { data } = await api.post("/rooms/join", { roomCode });
    set({ room: data.room, loading: false });
    return data.room;
  },
  async fetchRoom(roomCode) {
    set({ loading: true });
    const { data } = await api.get(`/rooms/${roomCode}`);
    set({ room: data.room, loading: false });
    return data.room;
  },
  async leaveRoom(roomCode) {
    set({ loading: true });
    const { data } = await api.post("/rooms/leave", { roomCode });
    set({ room: null, loading: false });
    return data;
  },
  setRoom(room) {
    set((state) => ({ room: typeof room === "function" ? room(state.room) : room }));
  },
}));
