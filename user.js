import { Router } from "express";
import { requireAuth } from "./auth.js";
import {
  getMe,
  getUserData,
  createUserData,
  updateUserData,
  deleteUserData,
} from "./userCONTROLLER.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMe);
router.get("/me/data", getUserData);
router.post("/me/data", createUserData);
router.put("/me/data/:id", updateUserData);
router.delete("/me/data/:id", deleteUserData);

export default router;
