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
			orderBy: {
				created_at: "desc",
			},
		});

		if (!lotteryContest) {
			return res.status(400).json({
				success: false,
				error: "No game is running currently",
			});
		}

		const earlierBet = await prismaClient.colorGameEntry.findFirst({
			where: {
				userId: user.id,
				colorGameId: lotteryContest.id,
			},
			select: {
				id: true,
			},
		});

		if (earlierBet) {
			return res.status(400).json({
				success: false,
				error: "You have already placed a bet, you can update that bet but cannot place another one",
			});
		}

		const userWallet = await prismaClient.wallet.findUnique({
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
				error: "No wallet found for this user",
			});
		}

		if (requestBody.bet_amount > Number(userWallet.bonus_balance) + Number(userWallet.current_balance)) {
			return res.status(400).json({
				success: false,
				error: "Not enough wallet balance",
			});
		}

		const amountToBeDeductedFromBonusBalance =
			Number(userWallet.bonus_balance) - requestBody.bet_amount < 0
				? Number(userWallet.bonus_balance)
				: requestBody.bet_amount;

		const amountToBeDeductedFromCurrentBalance =
			Number(userWallet.bonus_balance) - requestBody.bet_amount < 0
				? Number(userWallet.bonus_balance) - requestBody.bet_amount * -1
				: 0;

		const userWalletUpdationPromise = prismaClient.wallet.update({
			where: {
				userId: user.id,
			},
			data: {
				bonus_balance: {
					decrement: amountToBeDeductedFromBonusBalance,
				},
				current_balance: {
					decrement: amountToBeDeductedFromCurrentBalance,
				},
			},
		});

		const createTransactionPromise = prismaClient.transaction.create({
			data: {
				userId: user.id,
				amount: requestBody.bet_amount,
				transaction_type: "bet",
			},
		});

		const createBetPromise = prismaClient.colorGameEntry.create({
			data: {
				userId: user.id,
				picked_color: requestBody.bet_color,
				token_amount: requestBody.bet_amount,
				colorGameId: lotteryContest.id,
			},
			select: {
				id: true,
				colorGameId: true,
				userId: true,
				token_amount: true,
				picked_color: true,
			},
		});

		const [createdBet] = await Promise.all([createBetPromise, createTransactionPromise, userWalletUpdationPromise]);

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
