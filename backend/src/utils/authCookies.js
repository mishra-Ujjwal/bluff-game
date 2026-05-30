const COOKIE_NAME = "bluff_royale_token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const authCookieName = COOKIE_NAME;

export const getAuthCookieOptions = () => ({
  httpOnly: false,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: SEVEN_DAYS_MS,
  path: "/",
});

export const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, getAuthCookieOptions());
};

export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    ...getAuthCookieOptions(),
    maxAge: undefined,
  });
};
