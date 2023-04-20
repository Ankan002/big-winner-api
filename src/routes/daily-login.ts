import { hasLoggedInToday, loginDaily } from "controllers/daily-login";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const dailyLoginRouter = Router();

dailyLoginRouter.route("/").post(isAuthenticated, loginDaily);

dailyLoginRouter.route("/has-logged-in").get(isAuthenticated, hasLoggedInToday);
