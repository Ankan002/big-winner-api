import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { format } from "date-fns";

export const loginDaily = async (req: Request, res: Response) => {
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

		if (todaysLoginRecord) {
			return res.status(400).json({
				success: false,
				error: "Daily login bonus already granted!!",
			});
		}

		const rewardTokenAmount = Math.floor(Math.random() * 10) + 1;

		const walletUpdationPromise = prismaInstance.wallet.update({
			where: {
				userId: user.id,
			},
			data: {
				bonus_balance: {
					increment: rewardTokenAmount,
				},
			},
			select: {
				id: true,
			},
		});

		const createTransactionPromise = prismaInstance.transaction.create({
			data: {
				amount: rewardTokenAmount,
				transaction_type: "bonus",
				userId: user.id,
			},
			select: {
				id: true,
			},
		});

		const createDailyLoginRecordPromise = prismaInstance.dailyLogin.create({
			data: {
				userId: user.id,
				date: currentDate,
			},
			select: {
				id: true,
			},
		});

		await Promise.all([walletUpdationPromise, createTransactionPromise, createDailyLoginRecordPromise]);

		return res.status(200).json({
			success: true,
			data: {
				amount_of_token_granted: rewardTokenAmount,
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
