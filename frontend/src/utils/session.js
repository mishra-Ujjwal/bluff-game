const TOKEN_KEY = "bluff-royale-token";
const COOKIE_NAME = "bluff_royale_token";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export const getStoredToken = () => {
  const localToken = localStorage.getItem(TOKEN_KEY);
  if (localToken) {
    return localToken;
  }

  const cookieEntry = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${COOKIE_NAME}=`));

  return cookieEntry ? decodeURIComponent(cookieEntry.split("=")[1]) : null;
};

export const persistSessionToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; max-age=${SEVEN_DAYS}; path=/; SameSite=Lax`;
};

export const clearSessionToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
};
