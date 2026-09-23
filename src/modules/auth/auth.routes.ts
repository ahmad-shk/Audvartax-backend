import { Router } from "express";
import {
  currentUser,
  forgotPasswordUser,
  resetPasswordUser,
  googleLoginUser,
  loginUser,
  logoutUser,
  registerUser,
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.post("/google", googleLoginUser);
authRouter.post("/forgot-password", forgotPasswordUser);
authRouter.post("/reset-password", resetPasswordUser);
authRouter.post("/logout", logoutUser);
authRouter.get("/me", currentUser);
