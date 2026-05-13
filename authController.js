// src/controllers/authController.js
// Handles user registration, login, JWT refresh, and logout.
// All DB operations go through Prisma; passwords are hashed with bcrypt.

import bcrypt from "bcrypt";
import prisma from "../utils/prisma.js";
import {
  signAccessToken,
  generateRefreshToken,
  refreshTokenExpiry,
} from "../utils/jwt.js";
import { validateEmail, validatePassword } from "../utils/validate.js";

const BCRYPT_ROUNDS = 12;

// ─── POST /api/register ───────────────────────────────────────────────────────
export async function register(req, res, next) {
  try {
    const { email, password } = req.body;

    // Validate inputs
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) return res.status(400).json({ error: emailCheck.message });

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) return res.status(400).json({ error: passwordCheck.message });

    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    // Hash password and create user
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { email: email.trim().toLowerCase(), password: hashed },
    });

    return res.status(201).json({
      message: "Account created successfully.",
      userId: user.id,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/login ──────────────────────────────────────────────────────────
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Look up user
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Use a constant-time compare even on "not found" to prevent timing attacks
    const passwordValid =
      user && (await bcrypt.compare(password, user.password));

    if (!user || !passwordValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Mint tokens
    const accessToken = signAccessToken({ id: user.id, email: user.email });
    const rawRefresh = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: rawRefresh,
        userId: user.id,
        expiresAt: refreshTokenExpiry(),
      },
    });

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: rawRefresh,
      token_type: "Bearer",
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/token/refresh ──────────────────────────────────────────────────
export async function refreshToken(req, res, next) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: "refresh_token is required." });
    }

    // Find the token in DB
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refresh_token },
      include: { user: true },
    });

    if (!stored) {
      return res.status(401).json({ error: "Refresh token not found." });
    }
    if (stored.revoked) {
      return res.status(401).json({ error: "Refresh token has been revoked." });
    }
    if (new Date() > stored.expiresAt) {
      return res.status(401).json({ error: "Refresh token has expired." });
    }

    // Issue a new access token
    const accessToken = signAccessToken({
      id: stored.user.id,
      email: stored.user.email,
    });

    return res.status(200).json({
      access_token: accessToken,
      token_type: "Bearer",
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/logout ─────────────────────────────────────────────────────────
export async function logout(req, res, next) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: "refresh_token is required." });
    }

    // Revoke the token (soft-delete via flag)
    const updated = await prisma.refreshToken.updateMany({
      where: { token: refresh_token, revoked: false },
      data: { revoked: true },
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: "Token not found or already revoked." });
    }

    return res.status(200).json({ message: "Logged out successfully." });
  } catch (err) {
    next(err);
  }
}
