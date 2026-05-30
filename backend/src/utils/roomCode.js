const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateRoomCode = (length = 6) => {
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  return code;
};
