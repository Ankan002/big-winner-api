import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestBodySchema = z.object({
	name: z
		.string()
		.trim()
		.min(3, { message: "Name should be at least 3 characters long" })
		.max(80, { message: "Name can be at max 80 characters long" }),
});

export const updateProfileName = async (req: Request, res: Response) => {
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
	const prismaInstance = getPrismaClient();

	try {
		const updatedUser = await prismaInstance.profile.update({
			where: {
				userId: user.id,
			},
			data: {
				name: requestBody.name.trim(),
			},
			select: {
				id: true,
			},
		});

		if (!updatedUser) {
			return res.status(400).json({
				success: false,
				error: "User not found",
			});
		}

		return res.status(200).json({
			success: true,
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
