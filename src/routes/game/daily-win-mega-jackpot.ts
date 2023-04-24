import {
	enterDailyWinMegaJackpot,
	findDailyWinMegaJackpotWinners,
	getCurrentDailyWinMegaJackpotCurrentUserEntries,
	increaseDailyWinMegaJackpotBetAmount,
} from "controllers/game";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const dailyWinMegaJackpotRouter = Router();

dailyWinMegaJackpotRouter.route("/enter-game").post(isAuthenticated, enterDailyWinMegaJackpot);

// * A GET route to get all the entries of the logged in user in the ongoing game.
dailyWinMegaJackpotRouter
	.route("/user/get-current-entries")
	.get(isAuthenticated, getCurrentDailyWinMegaJackpotCurrentUserEntries);

// * A PUT route to increase bet of a logged in user.
dailyWinMegaJackpotRouter.route("/increase-bet").put(isAuthenticated, increaseDailyWinMegaJackpotBetAmount);

dailyWinMegaJackpotRouter.route("/find-winner").post(findDailyWinMegaJackpotWinners);
