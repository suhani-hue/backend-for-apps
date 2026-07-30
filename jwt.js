import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "15m";

export function signAccessToken(payload) {
  return jwt.sign(payload, SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_EXPIRES,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, SECRET, { algorithms: ["HS256"] });
}

export function generateRefreshToken() {
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function refreshTokenExpiry() {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "7", 10);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
