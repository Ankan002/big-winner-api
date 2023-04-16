import { signUp } from "controllers/auth";
import { Router } from "express";

export const authRouter = Router();

authRouter.route("/sign-up").post(signUp);
