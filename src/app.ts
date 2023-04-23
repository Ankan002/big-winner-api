import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import { logger } from "utils/logger";
import { morganConfig } from "middlewares/morgan";
import { authRouter } from "routes/auth";
import { userRouter } from "routes/user";
import { profileRouter } from "routes/profile";
import { verifyEmailRouter } from "routes/verify-email";
import { walletRouter } from "routes/wallet";
import { dailyLoginRouter } from "routes/daily-login";
import { dailyWinJackpotRouter } from "routes/game";

export const startServer = async () => {
	const app = express();
	const PORT = process.env["PORT"];

	app.use(cors());
	app.use(express.json());
	app.use(
		fileUpload({
			useTempFiles: true,
		})
	);

	app.use(morganConfig);

	app.get("/", (req, res) => {
		return res.status(200).json({
			success: true,
			message: "Welcome to Big Winner API...",
		});
	});

	app.use("/api/auth", authRouter);
	app.use("/api/user", userRouter);
	app.use("/api/profile", profileRouter);
	app.use("/api/verify-email", verifyEmailRouter);
	app.use("/api/wallet", walletRouter);
	app.use("/api/daily-login", dailyLoginRouter);
	app.use("/api/game/daily-win-jackpot", dailyWinJackpotRouter);

	app.listen(PORT, () => logger.info(`App is running at PORT: ${PORT}`));
};
