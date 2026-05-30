import { io } from "socket.io-client";
import { getStoredToken } from "../utils/session";

let socket;

export const getSocket = () => {
  const token = getStoredToken();

  if (!socket && token) {
    socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });
  }

  return socket;
};

export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  return getSocket();
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
