import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
} from "./authController.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/token/refresh", refreshToken);
router.post("/logout", logout);

export default router;
