import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { format } from "date-fns";

export const hasLoggedInToday = async (req: Request, res: Response) => {
	const user = req.user;

	if (!user) {
		return res.status(400).json({
			success: false,
			error: "No user found!!",
		});
	}

	const prismaInstance = getPrismaClient();

	try {
		const currentDate = format(new Date(), "dd/MM/yyyy");

		const todaysLoginRecord = await prismaInstance.dailyLogin.findFirst({
			where: {
				userId: user.id,
				date: currentDate,
			},
			select: {
				id: true,
			},
		});

		if (!todaysLoginRecord) {
			return res.status(200).json({
				success: true,
				data: {
					has_logged_in_today: false,
				},
			});
		}

		return res.status(200).json({
			success: true,
			data: {
				has_logged_in_today: true,
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
