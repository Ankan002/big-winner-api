import { Prisma } from ".prisma/client";
import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestBodySchema = z.object({
	cron_password: z.string(),
});

export const findDailyWinJackpotWinners = async (req: Request, res: Response) => {
	const requestBodyValidationResult = RequestBodySchema.safeParse(req.body);

	if (!requestBodyValidationResult.success) {
		return res.status(400).json({
			success: false,
			error: requestBodyValidationResult.error.errors[0]?.message,
		});
	}

	const requestBody = requestBodyValidationResult.data;

	if (requestBody.cron_password !== process.env["CRON_PASSWORD"] ?? "") {
		return res.status(401).json({
			success: false,
			error: "Cron Access Denied!!",
		});
	}

	const prismaClient = getPrismaClient();

	try {
		const currentLottery = await prismaClient.dailyWinJackpot.findFirst({
			where: {
				status: "open",
			},
			select: {
				id: true,
				status: true,
				daily_win_jackpot_entries: {
					select: {
						id: true,
						userId: true,
						picked_number: true,
						token_amount: true,
					},
				},
			},
		});

		if (!currentLottery) {
			await prismaClient.dailyWinJackpot.create({
				data: {},
			});

			return res.status(400).json({
				success: false,
				error: "No active lottery was there so created one!!",
			});
		}

		await prismaClient.dailyWinJackpot.update({
			where: {
				id: currentLottery.id,
			},
			data: {
				status: "evaluating",
			},
		});

		const betsPlaced = currentLottery.daily_win_jackpot_entries;

		const totalBetPlacedOnEachNumbers: Record<number, number> = {};

		for (let i = 0; i < 10; i++) {
			totalBetPlacedOnEachNumbers[i] = 0;
		}

		for (const bet of betsPlaced) {
			totalBetPlacedOnEachNumbers[bet.picked_number] += bet.token_amount;
		}

		let minimumMostPlacedBetNumber = 0;

		Object.keys(totalBetPlacedOnEachNumbers).forEach((key) => {
			const minimumMostBet = totalBetPlacedOnEachNumbers[minimumMostPlacedBetNumber];
			const totalBetPlacedOnCurrentNumber = totalBetPlacedOnEachNumbers[Number(key)];

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

		const userWinningTransactions: Prisma.Enumerable<Prisma.TransactionCreateManyInput> = [];

		const lotteryWinners: Prisma.Enumerable<Prisma.DailyWinJackpotWinnerCreateManyInput> = [];

		const allPromisesToBeResolved = [];

		for (const winningBet of winningBets) {
			userWinningTransactions.push({
				amount: winningBet.token_amount * 9,
				transaction_type: "reward",
				userId: winningBet.userId,
			});

			lotteryWinners.push({
				entryId: winningBet.id,
				dailyWinJackpotId: currentLottery.id,
				token_amount_won: winningBet.token_amount * 9,
				userId: winningBet.userId,
			});

			const updateCurrentWonUserWalletPromise = prismaClient.wallet.update({
				where: {
					userId: winningBet.userId,
				},
				data: {
					winning_balance: {
						increment: winningBet.token_amount * 9,
					},
				},
			});

			allPromisesToBeResolved.push(updateCurrentWonUserWalletPromise);
		}

		const updateDailyWinJackpotPromise = prismaClient.dailyWinJackpot.update({
			where: {
				id: currentLottery.id,
			},
			data: {
				status: "closed",
				winning_number: minimumMostPlacedBetNumber,
			},
		});

		const createWinningTransactionsPromise =
			userWinningTransactions.length > 0
				? prismaClient.transaction.createMany({
						data: userWinningTransactions,
				  })
				: null;

		const createDailyWinJackpotWinnersPromise =
			lotteryWinners.length > 0
				? prismaClient.dailyWinJackpotWinner.createMany({
						data: lotteryWinners,
				  })
				: null;

		const createNewDailyWinJackpotGamePromise = prismaClient.dailyWinJackpot.create({
			data: {},
		});

		allPromisesToBeResolved.push(
			updateDailyWinJackpotPromise,
			createWinningTransactionsPromise,
			createDailyWinJackpotWinnersPromise,
			createNewDailyWinJackpotGamePromise
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

		return res.status(400).json({
			success: false,
			error: "Internal Server Error",
		});
	}
};
