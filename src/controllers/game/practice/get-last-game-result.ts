import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestQuerySchema = z.object({
	game_type: z.union([z.literal("regular"), z.literal("mega")], {
		required_error: "A Game Type needs to be mentioned it can be regular or mega",
		invalid_type_error: "Game Type van only be regular or mega",
	}),
});

export const getLastPracticeGameResult = async (req: Request, res: Response) => {
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
		const lastGameResult = await prismaClient.practiceGame.findFirst({
			where: {
				status: "closed",
				type: requestQuery.game_type,
			},
			select: {
				id: true,
				date: true,
				type: true,
				status: true,
				practice_game_winners: {
					select: {
						id: true,
						position: true,
						token_amount_won: true,
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
				last_practice_game_result: lastGameResult,
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
