import { ColorGameChoice, Prisma } from ".prisma/client";
import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestBodySchema = z.object({
	cron_password: z.string(),
});

export const findColorGameWinners = async (req: Request, res: Response) => {
	const requestBodyValidationResult = RequestBodySchema.safeParse(req.body);

	if (!requestBodyValidationResult.success) {
		return res.status(400).json({
			success: false,
			error: requestBodyValidationResult.error.errors[0]?.message,
		});
	}

	const requestBody = requestBodyValidationResult.data;

	if (requestBody.cron_password !== process.env["CRON_PASSWORD"]) {
		return res.status(401).json({
			success: false,
			error: "Access Denied!!",
		});
	}

	const prismaClient = getPrismaClient();

	try {
		const currentLottery = await prismaClient.colorGame.findFirst({
			where: {
				status: "open",
			},
			select: {
				id: true,
				status: true,
				color_game_entries: true,
			},
		});

		if (!currentLottery) {
			await prismaClient.colorGame.create({
				data: {
					winning_color: null,
				},
			});

			return res.status(400).json({
				success: false,
				error: "No active lottery was there so created one!!",
			});
		}

		await prismaClient.colorGame.update({
			where: {
				id: currentLottery.id,
			},
			data: {
				status: "evaluating",
			},
		});

		const betsPlaced = currentLottery.color_game_entries;

		const totalBetsPlaced: Record<string, number> = {
			red: 0,
			blue: 0,
			green: 0,
		};

		betsPlaced.forEach((bet) => {
			totalBetsPlaced[bet.picked_color] += bet.token_amount;
		});

		let minimumPlacedBetColor = "red";

		Object.keys(totalBetsPlaced).forEach((color) => {
			const minimumMostBet = totalBetsPlaced[minimumPlacedBetColor];
			const totalBetPlacedOnCurrentColor = totalBetsPlaced[color];

			if (
				minimumMostBet === undefined ||
				minimumMostBet === null ||
				totalBetPlacedOnCurrentColor === undefined ||
				totalBetPlacedOnCurrentColor === null
			)
				return;

			if (totalBetPlacedOnCurrentColor < minimumMostBet) {
				minimumPlacedBetColor = color;
			}
		});

		const winningBets = betsPlaced.filter((bet) => bet.picked_color === minimumPlacedBetColor);

		const userWinnngTransactions: Prisma.Enumerable<Prisma.TransactionCreateManyInput> = [];

		const lotteryWinners: Prisma.Enumerable<Prisma.ColorGameWinnerCreateManyInput> = [];

		const allPromisesToBeResolved = [];

		for (const winningBet of winningBets) {
			userWinnngTransactions.push({
				transaction_type: "reward",
				amount: Number(winningBet.token_amount) * 3,
				userId: winningBet.userId,
			});

			lotteryWinners.push({
				userId: winningBet.userId,
				token_amount_won: Number(winningBet.token_amount) * 3,
				colorGameEntryId: winningBet.id,
				colorGameId: winningBet.colorGameId,
			});

			allPromisesToBeResolved.push(
				prismaClient.wallet.update({
					where: {
						userId: winningBet.userId,
					},
					data: {
						current_balance: {
							increment: Number(winningBet.token_amount) * 3,
						},
					},
				})
			);
		}

		const createWinningTransactionsPromise =
			userWinnngTransactions.length > 0
				? prismaClient.transaction.createMany({
						data: userWinnngTransactions,
				  })
				: null;

		const createColorGameWinners =
			lotteryWinners.length > 0
				? prismaClient.colorGameWinner.createMany({
						data: lotteryWinners,
				  })
				: null;

		const updateCurrentColorGamePromise = prismaClient.colorGame.update({
			where: {
				id: currentLottery.id,
			},
			data: {
				status: "closed",
				winning_color: minimumPlacedBetColor as ColorGameChoice,
			},
		});

		const createColorGamePromise = prismaClient.colorGame.create({
			data: {},
		});

		allPromisesToBeResolved.push(
			createWinningTransactionsPromise,
			createColorGameWinners,
			updateCurrentColorGamePromise,
			createColorGamePromise
		);

		await Promise.all(allPromisesToBeResolved);

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
