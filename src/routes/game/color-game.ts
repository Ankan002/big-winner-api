import {
	enterColorGame,
	findColorGameWinners,
	getCurrentColorGameCurrentUserEntry,
	getLastColorGameResult,
	increaseColorGameBetAmount,
} from "controllers/game";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const colorGameRouter = Router();

colorGameRouter.route("/enter-game").post(isAuthenticated, enterColorGame);

// * A GET route to get all the entries of the logged in user in the ongoing game.
colorGameRouter.route("/user/get-current-entry").get(isAuthenticated, getCurrentColorGameCurrentUserEntry);

// * A PUT route to increase bet of a logged in user.
colorGameRouter.route("/increase-bet").put(isAuthenticated, increaseColorGameBetAmount);

colorGameRouter.route("/find-winner").post(findColorGameWinners);

colorGameRouter.route("/last-game-result").get(isAuthenticated, getLastColorGameResult);

colorGameRouter.route("/get-games").get(isAuthenticated);
