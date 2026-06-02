import { create } from "zustand";
import api from "../services/api";

export const useGameStore = create((set) => ({
  game: null,
  chat: [],
  history: [],
  stats: null,
  selectedCards: [],
  claimedRank: "A",
  timer: { remainingSeconds: 60, currentPlayerId: null, turnTimeLimit: 60 },
  reconnecting: false,
  setGame(game) {
    set({ game });
  },
  setTimer(timer) {
    set((state) => ({
      timer: {
        remainingSeconds: 60,
        currentPlayerId: null,
        turnTimeLimit: 60,
        ...state.timer,
        ...timer,
      },
    }));
  },
  setReconnecting(reconnecting) {
    set({ reconnecting });
  },
  addChat(message) {
    set((state) => ({ chat: [...state.chat, message] }));
  },
  resetChat() {
    set({ chat: [] });
  },
  toggleCard(cardId) {
    set((state) => ({
      selectedCards: state.selectedCards.includes(cardId)
        ? state.selectedCards.filter((id) => id !== cardId)
        : [...state.selectedCards, cardId],
    }));
  },
  clearSelection() {
    set({ selectedCards: [] });
  },
  setClaimedRank(claimedRank) {
    set({ claimedRank });
  },
  resetGameState() {
    set({
      game: null,
      chat: [],
      selectedCards: [],
      claimedRank: "A",
      timer: { remainingSeconds: 60, currentPlayerId: null, turnTimeLimit: 60 },
      reconnecting: false,
    });
  },
  async fetchHistory() {
    const { data } = await api.get("/game/history");
    set({ history: data.history, stats: data.stats });
  },
}));
