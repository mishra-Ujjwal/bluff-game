import { Router } from "express";
import { getGameHistory } from "../controllers/gameController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/history", requireAuth, getGameHistory);

export default router;
