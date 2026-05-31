const DIGITS = "0123456789";

export const generateRoomCode = (length = 6) => {
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += DIGITS[Math.floor(Math.random() * DIGITS.length)];
  }

  return code;
};
