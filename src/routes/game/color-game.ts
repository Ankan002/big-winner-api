import { enterColorGame, getCurrentColorGameCurrentUserEntry } from "controllers/game";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const colorGameRouter = Router();

colorGameRouter.route("/enter-game").post(isAuthenticated, enterColorGame);

// * A GET route to get all the entries of the logged in user in the ongoing game.
colorGameRouter.route("/user/get-current-entries").get(isAuthenticated, getCurrentColorGameCurrentUserEntry);
