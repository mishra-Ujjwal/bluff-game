import { verifyToken } from "../utils/jwt.js";
import { prisma } from "../utils/prisma.js";
import { authCookieName } from "../utils/authCookies.js";

const getTokenFromRequest = (req) => {
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;

  return bearerToken || req.cookies?.[authCookieName] || null;
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid token." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
