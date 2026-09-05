// src/controllers/oauthController.js
// Handles GitHub and Google OAuth flows.
// Exchanges OAuth code for user info, creates/finds user, returns JWT tokens.

import axios from "axios";
import prisma from "../utils/prisma.js";
import {
  signAccessToken,
  generateRefreshToken,
  refreshTokenExpiry,
} from "../utils/jwt.js";

// ─── GitHub OAuth ─────────────────────────────────────────────────────────────

export async function githubCallback(req, res, next) {
  try {
    const { code } = req.query;
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

    if (!code) {
      return res.redirect(`${FRONTEND_URL}/login?error=no_code`);
    }

    // Exchange code for access token
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const githubToken = tokenRes.data.access_token;
    if (!githubToken) {
      return res.redirect(`${FRONTEND_URL}/login?error=no_token`);
    }

    // Get user info from GitHub
    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${githubToken}` },
    });

    // Get user email
    const emailRes = await axios.get("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${githubToken}` },
    });

    const primaryEmail = emailRes.data.find(
      (e) => e.primary && e.verified
    )?.email;

    if (!primaryEmail) {
      return res.redirect(`${FRONTEND_URL}/login?error=no_email`);
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: primaryEmail },
    });

    if (!user) {
      // Create user with a random password (they will use OAuth to login)
      const randomPassword = generateRefreshToken();
      user = await prisma.user.create({
        data: {
          email: primaryEmail,
          password: randomPassword,
        },
      });
    }

    // Create tokens
    const accessToken = signAccessToken({ id: user.id, email: user.email });
    const rawRefresh = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: rawRefresh,
        userId: user.id,
        expiresAt: refreshTokenExpiry(),
      },
    });

    // Redirect to frontend with tokens
    return res.redirect(
      `${FRONTEND_URL}/auth/callback?access_token=${accessToken}&refresh_token=${rawRefresh}`
    );
  } catch (err) {
    next(err);
  }
}

export function githubLogin(req, res) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    scope: "user:email",
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}