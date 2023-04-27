import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";

export const getCurrentColorGameCurrentUserEntry = async (req: Request, res: Response) => {
	const user = req.user;

	if (!user) {
		return res.status(400).json({
			success: false,
			error: "No user found!!",
		});
	}

	const prismaClient = getPrismaClient();

	try {
		const currentGameEntry = await prismaClient.colorGameEntry.findFirst({
			where: {
				color_game: {
					status: "open",
				},
				userId: user.id,
			},
			select: {
				id: true,
				userId: true,
				picked_color: true,
				token_amount: true,
			},
			orderBy: {
				created_at: "desc",
			},
		});

		return res.status(200).json({
			success: true,
			current_game_entry: currentGameEntry,
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
