import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestBodySchema = z.object({
	bet_id: z.string(),
	token_amount: z.number().min(1, { message: "Bet must be increased by at least 1" }),
});

export const increaseColorGameBetAmount = async (req: Request, res: Response) => {
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
			prismaClient.colorGameEntry.findUnique({
				where: {
					id: requestBody.bet_id,
				},
				select: {
					token_amount: true,
					color_game: {
						select: {
							status: true,
						},
					},
					userId: true,
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

		if (retrievedEntry.color_game.status !== "open") {
			return res.status(400).json({
				success: false,
				error: "The contest is not open",
			});
		}

		if (retrievedEntry.userId !== user.id) {
			return res.status(401).json({
				success: false,
				error: "Access Denied!!",
			});
		}

		if (!userWallet) {
			return res.status(400).json({
				success: false,
				error: "No wallet found!!",
			});
		}

		const amountOfBetCanBeIncreased = 100000 - retrievedEntry.token_amount;

		if (amountOfBetCanBeIncreased < requestBody.token_amount) {
			return res.status(400).json({
				success: false,
				error: "Max bet that can be placed is 1,00,000 coins",
			});
		}

		if (requestBody.token_amount > Number(userWallet.bonus_balance) + Number(userWallet.current_balance)) {
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

		const createTransactionPromise = prismaClient.transaction.create({
			data: {
				transaction_type: "bet",
				userId: user.id,
				amount: requestBody.token_amount,
			},
		});

		const updateWalletPromise = prismaClient.wallet.update({
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

		const updateEntryPromise = prismaClient.colorGameEntry.update({
			where: {
				id: requestBody.bet_id,
			},
			data: {
				token_amount: {
					increment: requestBody.token_amount,
				},
			},
		});

		await Promise.all([createTransactionPromise, updateEntryPromise, updateWalletPromise]);

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
