import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestBodySchema = z.object({
	bet_id: z.string(),
	token_amount: z.number().min(1, { message: "Bet must be increased by at least 1" }),
});

export const increaseDailyWinMegaJackpotBetAmount = async (req: Request, res: Response) => {
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
	const prismaClient = getPrismaClient();

	try {
		const [retrievedEntry, userWallet] = await Promise.all([
			prismaClient.dailyWinMegaJackpotEntry.findUnique({
				where: {
					id: requestBody.bet_id,
				},
				select: {
					token_amount: true,
					daily_win_mega_jackpot: {
						select: {
							status: true,
						},
					},
				},
			}),
			prismaClient.wallet.findUnique({
				where: {
					userId: user.id,
				},
				select: {
					current_balance: true,
					bonus_balance: true,
				},
			}),
		]);

		if (!retrievedEntry) {
			return res.status(400).json({
				success: false,
				error: "No entry found!!",
			});
		}

		if (!userWallet) {
			return res.status(400).json({
				success: false,
				error: "No wallet found!!",
			});
		}

		if (retrievedEntry.daily_win_mega_jackpot.status !== "open") {
			return res.status(400).json({
				success: false,
				error: "The contest is not open",
			});
		}

		const amountOfBetCanBeIncreased = 100000 - retrievedEntry.token_amount;

		if (requestBody.token_amount > amountOfBetCanBeIncreased) {
			return res.status(400).json({
				success: false,
				error: "Max bet that can be placed is 1,00,000 coins",
			});
		}

		if (requestBody.token_amount > userWallet.bonus_balance + userWallet.current_balance) {
			return res.status(400).json({
				success: false,
				error: "Not enough balance",
			});
		}

		const amountToBeDeductedFromBonusBalance =
			Number(userWallet.bonus_balance) - requestBody.token_amount < 0
				? Number(userWallet.bonus_balance)
				: requestBody.token_amount;

		const amountToBeDeductedFromCurrentBalance =
			Number(userWallet.bonus_balance) - requestBody.token_amount < 0
				? (Number(userWallet.bonus_balance) - requestBody.token_amount) * -1
				: 0;

		const updateWalletPromise = prismaClient.wallet.update({
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

		const createTransactionPromise = prismaClient.transaction.create({
			data: {
				userId: user.id,
				amount: requestBody.token_amount,
				transaction_type: "bet",
			},
		});

		const updateEntryPromise = prismaClient.dailyWinMegaJackpotEntry.update({
			where: {
				id: requestBody.bet_id,
			},
			data: {
				token_amount: {
					increment: requestBody.token_amount,
				},
			},
		});

		await Promise.all([updateWalletPromise, createTransactionPromise, updateEntryPromise]);

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
