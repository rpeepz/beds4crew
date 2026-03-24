const jwt = require("jsonwebtoken");
const { ACCESS_COOKIE_NAME, parseBearerToken, getJwtSecrets } = require("../utils/tokenHelpers");
const User = require("../models/User");

const DISABLED_ACCOUNT_ALLOWED_PATH_PREFIXES = [
  "/api/auth/me",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/reactivation/request",
  "/api/tickets",
];

const isDisabledAccountAllowedPath = (req) => {
  const fullPath = (req.originalUrl || req.path || "").split("?")[0];
  return DISABLED_ACCOUNT_ALLOWED_PATH_PREFIXES.some((prefix) => fullPath.startsWith(prefix));
};

const parseEnvList = (value = "") =>
  value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

const isAllowlistedAdmin = (user = {}) => {
  const allowlistedIds = parseEnvList(process.env.ADMIN_ALLOWLIST_IDS || process.env.BEDS4CREW_ADMIN_ID || "");
  // const allowlistedEmails = parseEnvList(
  //   process.env.ADMIN_ALLOWLIST_EMAILS || process.env.BEDS4CREW_ADMIN_EMAIL || ""
  // );

  const userId = (user.id || user._id || "").toString().toLowerCase();
  const userEmail = (user.email || "").toString().toLowerCase();

  return (
    (allowlistedIds.length > 0 && allowlistedIds.includes(userId))
    // (allowlistedEmails.length > 0 && allowlistedEmails.includes(userEmail))
  );
};

const verifyToken = async (req, res, next) => {
  const authHeaderToken = parseBearerToken(req.headers["authorization"]);
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME];
  const tokenCandidates = [
    { token: authHeaderToken, source: "authorization" },
    { token: cookieToken, source: "cookie" },
  ].filter((entry) => Boolean(entry.token));

  if (tokenCandidates.length === 0) {
    return res.status(401).json({ message: "No token provided" });
  }

  const { accessSecret } = getJwtSecrets();
  for (const candidate of tokenCandidates) {
    try {
      const decoded = jwt.verify(candidate.token, accessSecret);
      const user = await User.findById(decoded.id)
        .select("_id email role isActive accountDisabledAt reactivationEligibleAt")
        .lean();

      if (!user) {
        continue;
      }

      req.user = {
        ...decoded,
        isActive: user.isActive !== false,
      };
      req.userAccount = user;
      req.authTokenSource = candidate.source;

      if (user.isActive === false && !isDisabledAccountAllowedPath(req)) {
        return res.status(423).json({
          message: "Account is disabled. Use the reactivation flow to restore access.",
          code: "ACCOUNT_DISABLED",
          reactivationEligibleAt: user.reactivationEligibleAt || null,
          accountDisabledAt: user.accountDisabledAt || null,
        });
      }

      return next();
    } catch (error) {
    }
  }

  return res.status(401).json({ message: "Token invalid/expired" });
};

const verifyAdmin = (req, res, next) => {
  if (!isAllowlistedAdmin(req.user)) {
    return res.status(403).json({ message: "Unauthorized: Admin access required" });
  }
  next();
};

module.exports = verifyToken;
module.exports.verifyAdmin = verifyAdmin;
module.exports.isAllowlistedAdmin = isAllowlistedAdmin;
