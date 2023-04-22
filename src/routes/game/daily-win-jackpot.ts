import { enterDailyWinJackpot, getCurrentDailyWinJackpotCurrentUserEntries } from "controllers/game";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const dailWinJackpotRouter = Router();

dailWinJackpotRouter.route("/enter-game").post(isAuthenticated, enterDailyWinJackpot);

// * A GET route to get all the entries of the logged in user in the ongoing game.
dailWinJackpotRouter
	.route("/user/get-current-entries")
	.get(isAuthenticated, getCurrentDailyWinJackpotCurrentUserEntries);
