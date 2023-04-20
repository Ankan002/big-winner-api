import { hasLoggedInToday } from "controllers/daily-login";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const dailyLoginRouter = Router();

dailyLoginRouter.route("/has-logged-in").get(isAuthenticated, hasLoggedInToday);
