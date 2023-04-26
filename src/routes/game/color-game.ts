import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const colorGameRouter = Router();

colorGameRouter.route("/enter-game").post(isAuthenticated);
