import { enterDailyWinJackpot } from "controllers/game";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const dailWinJackpotRouter = Router();

dailWinJackpotRouter.route("/enter-game").post(isAuthenticated, enterDailyWinJackpot);
