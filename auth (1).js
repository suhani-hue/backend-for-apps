// src/routes/auth.js
// Express router for authentication endpoints.
// No auth middleware here — these routes are intentionally public.

import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
} from "../controllers/authController.js";

const router = Router();

// POST /api/register
router.post("/register", register);

// POST /api/login
router.post("/login", login);

// POST /api/token/refresh  — exchange refresh_token for a new access_token
router.post("/token/refresh", refreshToken);

// POST /api/logout  — revoke refresh_token
router.post("/logout", logout);

export default router;
