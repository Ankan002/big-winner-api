import {
	enterPracticeGame,
	findPracticeGameWinner,
	getCurrentPracticeGameCurrentUserEntry,
	getLastPracticeGameResult,
} from "controllers/game";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const practiceGameRouter = Router();

practiceGameRouter.route("/enter-game").post(isAuthenticated, enterPracticeGame);

practiceGameRouter.route("/user/get-current-entry").get(isAuthenticated, getCurrentPracticeGameCurrentUserEntry);

practiceGameRouter.route("/find-winner").post(findPracticeGameWinner);

practiceGameRouter.route("/last-game-result").get(isAuthenticated, getLastPracticeGameResult);
