import { getUser } from "controllers/user";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const userRouter = Router();

userRouter.route("/").get(isAuthenticated, getUser);
