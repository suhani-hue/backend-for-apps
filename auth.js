// src/middleware/auth.js
// Express middleware that protects routes by validating the Bearer JWT.
// Attaches the decoded user object to req.user so controllers can use it.

import { verifyAccessToken } from "../utils/jwt.js";

/**
 * requireAuth — must be used on every protected route.
 * Usage:  router.get("/me", requireAuth, meController)
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    // Attach only the fields we care about — never forward the full JWT payload
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Access token has expired. Please refresh." });
    }
    return res.status(401).json({ error: "Invalid access token." });
  }
}
