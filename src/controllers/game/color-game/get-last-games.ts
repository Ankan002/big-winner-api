import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestQuerySchema = z.object({
	amount: z.string().optional(),
});

export const getLastColorGames = async (req: Request, res: Response) => {
	const requestQueryValidationResult = RequestQuerySchema.safeParse(req.query);

	if (!requestQueryValidationResult.success) {
		return res.status(400).json({
			success: false,
			error: requestQueryValidationResult.error.errors[0]?.message,
		});
	}

	const requestQuery = requestQueryValidationResult.data;
	const prismaClient = getPrismaClient();

	try {
		const numberOfRecordsRequired =
			parseInt(requestQuery.amount ?? "10") > 10 ? 10 : parseInt(requestQuery.amount ?? "10");

		const gameHistory = await prismaClient.colorGame.findMany({
			where: {
				status: "closed",
			},
			select: {
				id: true,
				winning_color: true,
				status: true,
			},
			orderBy: {
				created_at: "desc",
			},
			take: numberOfRecordsRequired,
		});

		return res.status(200).json({
			success: true,
			data: {
				game_history: gameHistory,
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
