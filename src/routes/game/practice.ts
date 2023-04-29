import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const practiceGameRouter = Router();

practiceGameRouter.route("/regular/enter-game").post(isAuthenticated);
