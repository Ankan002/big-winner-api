import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";

export const getLastColorGameResult = async (req: Request, res: Response) => {
	const prismaClient = getPrismaClient();

	try {
		const lastGameResult = await prismaClient.colorGame.findFirst({
			where: {
				status: "closed",
			},
			select: {
				id: true,
				status: true,
				winning_color: true,
				color_game_winners: {
					select: {
						id: true,
						token_amount_won: true,
						userId: true,
						colorGameEntryId: true,
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
			orderBy: {
				created_at: "desc",
			},
		});

		return res.status(200).json({
			success: true,
			data: {
				last_color_game_result: lastGameResult,
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
			error: "Internal Server Error",
		});
	}
};
