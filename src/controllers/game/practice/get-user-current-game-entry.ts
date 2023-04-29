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

export const getCurrentPracticeGameCurrentUserEntry = async (req: Request, res: Response) => {
	const user = req.user;

	if (!user) {
		return res.status(400).json({
			success: false,
			error: "No user found!!",
		});
	}

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
		const retrievedEntry = await prismaClient.practiceGameEntry.findFirst({
			where: {
				userId: user.id,
				practice_game: {
					status: "open",
					type: requestQuery.game_type,
				},
			},
			select: {
				id: true,
				practiceGameId: true,
				userId: true,
				created_at: true,
				updated_at: true,
			},
		});

		return res.status(400).json({
			success: true,
			data: {
				entry: retrievedEntry,
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
