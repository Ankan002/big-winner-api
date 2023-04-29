import { enterPracticeGame, getCurrentPracticeGameCurrentUserEntry } from "controllers/game";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const practiceGameRouter = Router();

practiceGameRouter.route("/enter-game").post(isAuthenticated, enterPracticeGame);

practiceGameRouter.route("/user/current-game-entry").get(isAuthenticated, getCurrentPracticeGameCurrentUserEntry);
