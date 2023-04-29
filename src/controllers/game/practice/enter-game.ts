import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestBodySchema = z.object({
	game_type: z.union([z.literal("regular"), z.literal("mega")], {
		required_error: "A Game Type needs to be mentioned it can be regular or mega",
		invalid_type_error: "Game Type van only be regular or mega",
	}),
});

export const enterPracticeGame = async (req: Request, res: Response) => {
	const user = req.user;

	if (!user) {
		return res.status(400).json({
			success: false,
			error: "No user found!!",
		});
	}

	const requestBodyValidationResult = RequestBodySchema.safeParse(req.body);

	if (!requestBodyValidationResult.success) {
		return res.status(400).json({
			success: false,
			error: requestBodyValidationResult.error.errors[0]?.message,
		});
	}

	const requestBody = requestBodyValidationResult.data;
	const prismaClient = getPrismaClient();

	try {
		const currentLottery = await prismaClient.practiceGame.findFirst({
			where: {
				status: "open",
				type: requestBody.game_type,
			},
			select: {
				id: true,
				status: true,
			},
			orderBy: {
				created_at: "desc",
			},
		});

		if (!currentLottery) {
			return res.status(400).json({
				success: false,
				error: "No practice contest of the required type is going on",
			});
		}

		const ealierEntry = await prismaClient.practiceGameEntry.findFirst({
			where: {
				userId: user.id,
				practiceGameId: currentLottery.id,
			},
			select: {
				id: true,
			},
			orderBy: {
				created_at: "desc",
			},
		});

		if (ealierEntry) {
			return res.status(400).json({
				success: false,
				error: "Already entered game!!",
			});
		}

		const entry = await prismaClient.practiceGameEntry.create({
			data: {
				userId: user.id,
				practiceGameId: currentLottery.id,
			},
			select: {
				id: true,
				practiceGameId: true,
				userId: true,
				created_at: true,
				updated_at: true,
			},
		});

		return res.status(200).json({
			success: true,
			data: {
				entry,
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
