import { Prisma } from ".prisma/client";
import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestBodySchema = z.object({
	cron_password: z.string(),
});

export const findDailyWinMegaJackpotWinners = async (req: Request, res: Response) => {
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
		const currentLottery = await prismaClient.dailyWinMegaJackpot.findFirst({
			where: {
				status: "open",
			},
			select: {
				id: true,
				daily_win_mega_jackpot_entries: {
					select: {
						id: true,
						userId: true,
						token_amount: true,
						picked_number: true,
					},
				},
			},
		});

		if (!currentLottery) {
			await prismaClient.dailyWinMegaJackpot.create({
				data: {},
			});

			return res.status(400).json({
				success: false,
				error: "No active lottery was there so created one!!",
			});
		}

		await prismaClient.dailyWinMegaJackpot.update({
			where: {
				id: currentLottery.id,
			},
			data: {
				status: "evaluating",
			},
		});

		const betsPlaced = currentLottery.daily_win_mega_jackpot_entries;

		const totalBetsPlacedOnEachNumbers: Record<number, number> = {};

		for (let i = 0; i <= 25; i++) {
			totalBetsPlacedOnEachNumbers[i] = 0;
		}

		for (const bet of betsPlaced) {
			totalBetsPlacedOnEachNumbers[bet.picked_number] += bet.token_amount;
		}

		let minimumMostPlacedBetNumber = 0;

		Object.keys(totalBetsPlacedOnEachNumbers).forEach((key) => {
			const minimumMostBet = totalBetsPlacedOnEachNumbers[minimumMostPlacedBetNumber];
			const totalBetPlacedOnCurrentNumber = totalBetsPlacedOnEachNumbers[Number(key)];

			if (
				minimumMostBet === undefined ||
				minimumMostBet === null ||
				totalBetPlacedOnCurrentNumber === undefined ||
				totalBetPlacedOnCurrentNumber === null
			)
				return;

			if (totalBetPlacedOnCurrentNumber < minimumMostBet) minimumMostPlacedBetNumber = Number(key);
		});

		const winningBets = betsPlaced.filter((bet) => bet.picked_number === minimumMostPlacedBetNumber);

		const userWinnngTransactions: Prisma.Enumerable<Prisma.TransactionCreateManyInput> = [];

		const lotteryWinners: Prisma.Enumerable<Prisma.DailyWinMegaJackpotWinnerCreateManyInput> = [];

		const allPromisesToBeResolved = [];

		for (const winningBet of winningBets) {
			userWinnngTransactions.push({
				amount: winningBet.token_amount * 25,
				userId: winningBet.userId,
				transaction_type: "reward",
			});

			lotteryWinners.push({
				token_amount_won: winningBet.token_amount * 25,
				entryId: winningBet.id,
				dailyWinJackpotId: currentLottery.id,
				userId: winningBet.userId,
			});

			allPromisesToBeResolved.push(
				prismaClient.wallet.update({
					where: {
						userId: winningBet.userId,
					},
					data: {
						current_balance: {
							increment: winningBet.token_amount * 25,
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

		const createDailyWinMegaJackpotWinnersPromise =
			lotteryWinners.length > 0
				? prismaClient.dailyWinMegaJackpotWinner.createMany({
						data: lotteryWinners,
				  })
				: null;

		const updateDailyWinMegaJackpotPromise = prismaClient.dailyWinMegaJackpot.update({
			where: {
				id: currentLottery.id,
			},
			data: {
				winning_number: minimumMostPlacedBetNumber,
				status: "closed",
			},
		});

		const createDailyWinMegaJackpotGamePromise = prismaClient.dailyWinMegaJackpot.create({
			data: {},
		});

		allPromisesToBeResolved.push(
			createDailyWinMegaJackpotWinnersPromise,
			createWinningTransactionsPromise,
			updateDailyWinMegaJackpotPromise,
			createDailyWinMegaJackpotGamePromise
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
