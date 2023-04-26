import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestSchemaBody = z.object({
	bet_amount: z
		.number()
		.min(10, { message: "Place at least 10 coins as bet" })
		.max(100000, { message: "Place at most 1,00,000 coins as bet" }),
	bet_color: z.union([z.literal("red"), z.literal("blue"), z.literal("green")], {
		required_error: "Pick a color from red, blue or green",
	}),
});

export const enterColorGame = async (req: Request, res: Response) => {
	const user = req.user;

	if (!user) {
		return res.status(400).json({
			success: false,
			error: "No user found!!",
		});
	}

	const requestBodyValidationResult = RequestSchemaBody.safeParse(req.body);

	if (!requestBodyValidationResult.success) {
		return res.status(400).json({
			success: false,
			error: requestBodyValidationResult.error.errors[0]?.message,
		});
	}

	const requestBody = requestBodyValidationResult.data;
	const prismaClient = getPrismaClient();

	try {
		const lotteryContest = await prismaClient.colorGame.findFirst({
			where: {
				status: "open",
			},
			select: {
				id: true,
				status: true,
			},
		});

		if(!lotteryContest) {
			
		}
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
