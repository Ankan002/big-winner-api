import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";

export const getLastDailyWinJackpotResult = async (req: Request, res: Response) => {
	const prismaClient = getPrismaClient();

	try {
		const lastDailyWinJackPotResult = await prismaClient.dailyWinJackpot.findFirst({
			where: {
				status: "closed",
			},
			select: {
				id: true,
				status: true,
				winning_number: true,
				daily_win_jackpot_winners: {
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
				last_daily_win_jackpot_result: lastDailyWinJackPotResult,
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
			error: "Inetrnal Server Error!!",
		});
	}
};
