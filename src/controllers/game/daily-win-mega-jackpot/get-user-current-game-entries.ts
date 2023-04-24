import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";

export const getCurrentDailyWinMegaJackpotCurrentUserEntries = async (req: Request, res: Response) => {
	const user = req.user;

	if (!user) {
		return res.status(400).json({
			success: false,
			error: "No user found!!",
		});
	}

	const prismaClient = getPrismaClient();

	try {
		const entries = await prismaClient.dailyWinMegaJackpotEntry.findMany({
			where: {
				userId: user.id,
				daily_win_mega_jackpot: {
					status: "open",
				},
			},
			select: {
				id: true,
				picked_number: true,
				token_amount: true,
				userId: true,
				dailyWinJackpotId: true,
			},
		});

		return res.status(200).json({
			success: true,
			data: {
				entries,
			},
		});
	} catch (error) {
		if (error instanceof Error) {
			logger.error(error.message);

			return res.status(400).json({
				success: false,
				error: error.message,
			});
		}

		logger.error(error);

		return res.status(500).json({
			success: false,
			error: "Internal Server Error!!",
		});
	}
};
