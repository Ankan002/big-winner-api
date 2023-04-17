import { updateProfileName } from "controllers/profile";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const profileRouter = Router();

profileRouter.route("/update-name").put(isAuthenticated, updateProfileName);
