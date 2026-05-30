import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { configureSocket } from "./socket/socketServer.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Bluff Royale API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/game", gameRoutes);
app.use(errorMiddleware);

configureSocket(io);

const PORT = Number(process.env.PORT || 5000);
server.listen(PORT, () => {
  console.log(`Bluff Royale backend running on port ${PORT}`);
});
