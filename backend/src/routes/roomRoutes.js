import { Router } from "express";
import { createRoom, getRoomByCode, joinRoom } from "../controllers/roomController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/create", requireAuth, createRoom);
router.post("/join", requireAuth, joinRoom);
router.get("/:roomCode", requireAuth, getRoomByCode);

export default router;
