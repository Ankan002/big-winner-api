import { Request, Response } from "express";
import { getMailgunClient } from "utils/get-mailgun-client";
import { getPrismaClient } from "utils/get-prisma-client";
import { getRedisClient } from "utils/get-redis-client";
import { logger } from "utils/logger";

export const getOtp = async (req: Request, res: Response) => {
	const user = req.user;

	if (!user) {
		return res.status(400).json({
			success: false,
			error: "No User Found",
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
			},
		});

		if (!retrievedUser) {
			return res.status(400).json({
				success: false,
				error: "No User Found",
			});
		}

		const otp = new Array(6)
			.fill(0)
			.map(() => Math.floor(Math.random() * 10).toString())
			.join("");

		const mailgunClient = getMailgunClient();

		await mailgunClient.messages.create(process.env["MAILGUN_DOMAIN"] ?? "", {
			from: `OTP Sender <support@${process.env["MAILGUN_DOMAIN"] ?? ""}>`,
			to: [user.email],
			subject: "Email Verfication OTP",
			html: `
				<p>OTP to verify your email id is:</p>
				<h1>${otp}</h1>
			`,
		});

		const redisClient = getRedisClient();

		// TODO: Check if there's a better way to connect.
		await redisClient.connect();

		await redisClient.hSet(user.email, "otp", otp);
		await redisClient.expire(user.email, 600);

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
