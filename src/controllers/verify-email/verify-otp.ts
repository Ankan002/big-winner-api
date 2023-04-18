import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { getRedisClient } from "utils/get-redis-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestBodySchema = z.object({
	otp: z.string().min(6, { message: "OTP must be of length 6" }).max(6, { message: "OTP must be of length 6" }),
});

export const verifyOtp = async (req: Request, res: Response) => {
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

	try {
		const redisClient = getRedisClient();
		const prismaInstance = getPrismaClient();

		if (!redisClient.isReady) {
			await redisClient.connect();
		}

		const otpSent = await redisClient.hGet(user.email, "otp");

		if (!otpSent) {
			return res.status(400).json({
				success: false,
				error: "Either no OTP was sent or it has expired!!",
			});
		}

		if (otpSent !== requestBody.otp) {
			return res.status(400).json({
				success: false,
				error: "Wrong OTP",
			});
		}

		await redisClient.hDel(user.email, "otp");

		await prismaInstance.user.update({
			where: {
				email: user.email,
			},
			data: {
				email_verified: true,
			},
			select: {
				id: true,
			},
		});

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
			error: "Internal Server Error",
		});
	}
};
