import { Router } from "express";
import { createRoom, getRoomByCode, joinRoom, leaveRoom } from "../controllers/roomController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/create", requireAuth, createRoom);
router.post("/join", requireAuth, joinRoom);
router.post("/leave", requireAuth, leaveRoom);
router.get("/:roomCode", requireAuth, getRoomByCode);

export default router;
