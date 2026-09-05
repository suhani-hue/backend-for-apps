// src/routes/oauth.js
// OAuth routes for GitHub and Google login.
// These are public routes — no auth middleware needed.

import { Router } from "express";
import { githubLogin, githubCallback } from "../controllers/oauthController.js";

const router = Router();

// GET /api/auth/github — redirects to GitHub login page
router.get("/auth/github", githubLogin);

// GET /api/auth/github/callback — GitHub redirects here after login
router.get("/auth/github/callback", githubCallback);

export default router;