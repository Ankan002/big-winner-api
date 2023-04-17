import { getOtp } from "controllers/verify-email";
import { Router } from "express";
import { isAuthenticated } from "middlewares/auth";

export const verifyEmailRouter = Router();

verifyEmailRouter.route("/send-otp").post(isAuthenticated, getOtp);
