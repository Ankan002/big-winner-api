import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";

export const getUser = async (req: Request, res: Response) => {
	const user = req.user;

	if (!user) {
		return res.status(400).json({
			success: false,
			error: "User not found!!",
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
				email: true,
				mobile_number: true,
				username: true,
				profile: {
					select: {
						name: true,
						avatar: true,
					},
				},
				refer_code: true,
			},
		});

		if (!retrievedUser) {
			return res.status(400).json({
				success: false,
				error: "User not found!!",
			});
		}

		return res.status(200).json({
			success: true,
			data: {
				profile: retrievedUser,
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
