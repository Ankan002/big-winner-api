import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";

export const getLastDailyWinMegaJackpotResult = async (req: Request, res: Response) => {
	const prismaClient = getPrismaClient();

	try {
		const lastDailyWinMegaJackpotResult = await prismaClient.dailyWinMegaJackpot.findMany({
			where: {
				status: "closed",
			},
			select: {
				id: true,
				status: true,
				winning_number: true,
				daily_win_mega_jackpot_winners: {
					select: {
						id: true,
						token_amount_won: true,
						userId: true,
						entryId: true,
						user: {
							select: {
								id: true,
								email: true,
								username: true,
							},
						},
					},
				},
			},
			take: 1,
			orderBy: {
				created_at: "desc",
			},
		});

		return res.status(200).json({
			success: true,
			data: {
				last_daily_win_mega_jackpot_result:
					lastDailyWinMegaJackpotResult.length > 0 ? lastDailyWinMegaJackpotResult[0] : null,
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
