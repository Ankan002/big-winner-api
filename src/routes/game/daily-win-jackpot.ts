import {
	enterDailyWinJackpot,
	findDailyWinJackpotWinners,
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

// * A PUT route to increase bet of a logged in user.
dailyWinJackpotRouter.route("/increase-bet").put(isAuthenticated, increaseDailyWinJackpotBetAmount);

dailyWinJackpotRouter.route("/find-winner").post(findDailyWinJackpotWinners);
