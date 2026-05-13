// src/utils/jwt.js
// Helper functions for signing and verifying JWTs.
// Access tokens are short-lived (default 15 min); refresh tokens are long-lived (7 days).

import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "15m";

/**
 * Sign an access token for the given user payload.
 * @param {{ id: number, email: string }} payload
 * @returns {string} signed JWT
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_EXPIRES,
  });
}

/**
 * Verify and decode an access token.
 * Throws if the token is invalid or expired.
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, SECRET, { algorithms: ["HS256"] });
}

/**
 * Generate a random opaque refresh token string.
 * We store this in the DB so we can revoke it on logout.
 * @returns {string}
 */
export function generateRefreshToken() {
  // 48 random bytes → 64 hex characters, collision-resistant
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute the expiry Date for a refresh token.
 * @returns {Date}
 */
export function refreshTokenExpiry() {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "7", 10);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
