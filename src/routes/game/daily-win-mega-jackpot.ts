import { enterDailyWinMegaJackpot } from "controllers/game";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const dailyWinMegaJackpotRouter = Router();

dailyWinMegaJackpotRouter.route("/enter-game").post(isAuthenticated, enterDailyWinMegaJackpot);
