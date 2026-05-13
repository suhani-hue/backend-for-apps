// src/routes/user.js
// Express router for user-profile and data-store endpoints.
// Every route is protected by the requireAuth middleware.

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getMe,
  getUserData,
  createUserData,
  updateUserData,
  deleteUserData,
} from "../controllers/userController.js";

const router = Router();

// Apply auth middleware to ALL routes in this router
router.use(requireAuth);

// GET  /api/me         — return the logged-in user's profile
router.get("/me", getMe);

// GET  /api/me/data    — list all stored JSON items
router.get("/me/data", getUserData);

// POST /api/me/data    — create or upsert a key/value item
router.post("/me/data", createUserData);

// PUT  /api/me/data/:id — update a specific item (owner only)
router.put("/me/data/:id", updateUserData);

// DELETE /api/me/data/:id — delete a specific item (owner only)
router.delete("/me/data/:id", deleteUserData);

export default router;
