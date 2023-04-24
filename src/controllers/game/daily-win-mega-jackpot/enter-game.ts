import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestBodySchema = z.object({
	bet_amount: z
		.number()
		.min(10, { message: "Place at least 10 coins as bet" })
		.max(100000, { message: "Place at most 1,00,000 coins as bet" }),
	bet_number: z
		.number()
		.min(0, { message: "You can place bet from 0 - 25" })
		.max(25, { message: "You can place bet from 0 - 25" }),
});

export const enterDailyWinMegaJackpot = async (req: Request, res: Response) => {
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
		const lotteryContest = await prismaInstance.dailyWinMegaJackpot.findFirst({
			where: {
				status: "open",
			},
			select: {
				id: true,
				status: true,
			},
		});

		if (!lotteryContest) {
			return res.status(400).json({
				success: false,
				error: "Contest is not active currently...",
			});
		}

		const earlierBet = await prismaInstance.dailyWinMegaJackpotEntry.findFirst({
			where: {
				dailyWinJackpotId: lotteryContest.id,
				picked_number: requestBody.bet_number,
				userId: user.id,
			},
		});

		if (earlierBet) {
			return res.status(400).json({
				success: false,
				error: "You have already placed a bet on this number... now you cannot place a new bet, so just increase it",
			});
		}

		const userWallet = await prismaInstance.wallet.findUnique({
			where: {
				userId: user.id,
			},
			select: {
				bonus_balance: true,
				current_balance: true,
			},
		});

		if (!userWallet) {
			return res.status(400).json({
				success: false,
				error: "No wallet for given user found!!",
			});
		}

		if (requestBody.bet_amount > userWallet.bonus_balance + userWallet.current_balance) {
			return res.status(400).json({
				success: false,
				error: "No enough balance to deposit the amount",
			});
		}

		const amountToBeDeductedFromBonusBalance =
			Number(userWallet.bonus_balance) - requestBody.bet_amount < 0
				? Number(userWallet.bonus_balance)
				: requestBody.bet_amount;

		const amountToBeDeductedFromCurrentBalance =
			Number(userWallet.bonus_balance) - requestBody.bet_amount < 0
				? (Number(userWallet.bonus_balance) - requestBody.bet_amount) * -1
				: 0;

		const userWalletUpdationPromise = prismaInstance.wallet.update({
			where: {
				userId: user.id,
			},
			data: {
				current_balance: {
					decrement: amountToBeDeductedFromCurrentBalance,
				},
				bonus_balance: {
					decrement: amountToBeDeductedFromBonusBalance,
				},
			},
		});

		const createTransactionPromise = prismaInstance.transaction.create({
			data: {
				amount: requestBody.bet_amount,
				transaction_type: "bet",
				userId: user.id,
			},
		});

		const createBetPromise = prismaInstance.dailyWinMegaJackpotEntry.create({
			data: {
				token_amount: requestBody.bet_amount,
				picked_number: requestBody.bet_number,
				userId: user.id,
				dailyWinJackpotId: lotteryContest.id,
			},
			select: {
				id: true,
				dailyWinJackpotId: true,
				userId: true,
				token_amount: true,
				picked_number: true,
			},
		});

		const [createdBet] = await Promise.all([createBetPromise, userWalletUpdationPromise, createTransactionPromise]);

		return res.status(200).json({
			success: true,
			data: {
				bet: createdBet,
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
