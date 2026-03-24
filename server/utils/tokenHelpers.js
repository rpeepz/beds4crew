const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_COOKIE_NAME = "b4c_access";
const REFRESH_COOKIE_NAME = "b4c_refresh";
const CSRF_COOKIE_NAME = "b4c_csrf";
const AUTH_MODE_HEADER_NAME = "x-auth-mode";

const isProduction = process.env.NODE_ENV === "production";

const getJwtSecrets = () => {
  const accessSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error("JWT secrets are not fully configured");
  }

  return { accessSecret, refreshSecret };
};

const getCookieOptions = (maxAgeMs = 0) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
};

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE_NAME, getCookieOptions());
  res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());
};

const generateCsrfToken = () => crypto.randomBytes(24).toString("hex");

const setCsrfCookie = (res, csrfToken) => {
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearCsrfCookie = (res) => {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
};

const parseBearerToken = (authorizationHeader = "") => {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
};

const normalizeAuthMode = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : null;

const isAppAuthModeRequest = (req = {}) => {
  const headerMode = normalizeAuthMode(req.headers?.[AUTH_MODE_HEADER_NAME]);
  const bodyMode = normalizeAuthMode(req.body?.authMode || req.body?.transportMode);
  return headerMode === "app" || bodyMode === "app";
};

const getAccessTokenFromRequest = (req = {}) => {
  const bearerToken = parseBearerToken(req.headers?.authorization);
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME] || null;
  return bearerToken || cookieToken;
};

const getRefreshTokenFromRequest = (req = {}, { preferAppFallback = false } = {}) => {
  const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME] || null;
  const bodyToken = req.body?.refreshToken || null;
  const bearerToken = parseBearerToken(req.headers?.authorization);

  if (preferAppFallback) {
    return bodyToken || bearerToken || cookieToken;
  }

  return cookieToken || bodyToken || bearerToken;
};

// Generate access and refresh tokens
const generateTokens = (user) => {
  const { accessSecret, refreshSecret } = getJwtSecrets();
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImagePath: user.profileImagePath,
    isActive: user.isActive !== false,
    accountDisabledAt: user.accountDisabledAt || null,
    reactivationEligibleAt: user.reactivationEligibleAt || null,
  };

  // Access token - short lived (15 minutes)
  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: "15m",
  });

  // Refresh token - long lived (7 days)
  const refreshToken = jwt.sign({ id: user._id }, refreshSecret, { expiresIn: "7d" });

  return { accessToken, refreshToken };
};

module.exports = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  AUTH_MODE_HEADER_NAME,
  getJwtSecrets,
  setAuthCookies,
  clearAuthCookies,
  generateCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
  parseBearerToken,
  isAppAuthModeRequest,
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
  generateTokens,
};
