import {
	enterDailyWinJackpot,
	getCurrentDailyWinJackpotCurrentUserEntries,
	increaseDailyWinJackpotBetAmount,
} from "controllers/game";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const dailyWinJackpotRouter = Router();

dailyWinJackpotRouter.route("/enter-game").post(isAuthenticated, enterDailyWinJackpot);

// * A GET route to get all the entries of the logged in user in the ongoing game.
dailyWinJackpotRouter
	.route("/user/get-current-entries")
	.get(isAuthenticated, getCurrentDailyWinJackpotCurrentUserEntries);

dailyWinJackpotRouter.route("/increase-bet").put(isAuthenticated, increaseDailyWinJackpotBetAmount);
