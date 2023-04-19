import { deposit } from "controllers/wallet";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const walletRouter = Router();

walletRouter.route("/deposit").post(isAuthenticated, deposit);
