import jwt from "jsonwebtoken";

export const signToken = (user) =>
  jwt.sign({ userId: user.id, email: user.email, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
