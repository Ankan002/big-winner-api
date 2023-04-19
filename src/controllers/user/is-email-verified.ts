import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";

export const isEmailVerified = async (req: Request, res: Response) => {
	const user = req.user;

	if (!user) {
		return res.status(400).json({
			success: false,
			error: "No user found!!",
		});
	}

	const prismaInstance = getPrismaClient();

	try {
		const retrievedUser = await prismaInstance.user.findUnique({
			where: {
				id: user.id,
			},
			select: {
				id: true,
				email_verified: true,
			},
		});

		if (!retrievedUser) {
			return res.status(400).json({
				success: false,
				error: "No user found!!",
			});
		}

		return res.status(200).json({
			success: true,
			data: {
				is_email_verified: retrievedUser.email_verified,
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
