import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { format as formatDate } from "date-fns";
import { z } from "zod";
import { Prisma } from ".prisma/client";

const RequestBodySchema = z.object({
	game_type: z.union([z.literal("regular"), z.literal("mega")], {
		required_error: "A Game Type needs to be mentioned it can be regular or mega",
		invalid_type_error: "Game Type van only be regular or mega",
	}),
	cron_password: z.string(),
});

export const findPracticeGameWinner = async (req: Request, res: Response) => {
	const requestBodySchemaValidationResult = RequestBodySchema.safeParse(req.body);

	if (!requestBodySchemaValidationResult.success) {
		return res.status(400).json({
			success: false,
			error: requestBodySchemaValidationResult.error.errors[0]?.message,
		});
	}

	const requestBody = requestBodySchemaValidationResult.data;

	if (requestBody.cron_password !== process.env["CRON_PASSWORD"]) {
		return res.status(401).json({
			success: false,
			error: "Access Denied!!",
		});
	}

	const prismaClient = getPrismaClient();

	try {
		const currentLottery = await prismaClient.practiceGame.findFirst({
			where: {
				status: "open",
				type: requestBody.game_type,
			},
			select: {
				id: true,
				status: true,
				type: true,
				practice_game_entries: {
					select: {
						id: true,
						userId: true,
						practiceGameId: true,
					},
				},
			},
			orderBy: {
				created_at: "desc",
			},
		});

		if (!currentLottery) {
			await prismaClient.practiceGame.create({
				data: {
					type: requestBody.game_type,
					date: formatDate(new Date(), "dd/MM/yyyy"),
				},
			});

			return res.status(400).json({
				success: false,
				error: "No active lottery was there so created one!!",
			});
		}

		await prismaClient.practiceGame.update({
			where: {
				id: currentLottery.id,
			},
			data: {
				status: "evaluating",
			},
		});

		const lotteryEntries = currentLottery.practice_game_entries;

		const firstPickedEntry =
			lotteryEntries.length > 0 ? lotteryEntries[Math.floor(Math.random() * lotteryEntries.length)] : null;

		const remainingLotteryEntries = lotteryEntries.filter((entry) => entry.id !== firstPickedEntry?.id);

		const secondPickedEntry =
			remainingLotteryEntries.length > 0
				? remainingLotteryEntries[Math.floor(Math.random() * remainingLotteryEntries.length)]
				: null;

		const userWinnngTransactions: Prisma.Enumerable<Prisma.TransactionCreateManyInput> = [];

		const lotteryWinners: Prisma.Enumerable<Prisma.PracticeGameWinnerCreateManyInput> = [];

		const allPromisesToBeResolved = [];

		if (firstPickedEntry) {
			userWinnngTransactions.push({
				userId: firstPickedEntry.userId,
				amount: currentLottery.type === "regular" ? 100 : 150,
				transaction_type: "reward",
			});

			lotteryWinners.push({
				position: "first",
				practiceGameEntryId: firstPickedEntry.id,
				practiceGameId: currentLottery.id,
				userId: firstPickedEntry.userId,
				token_amount_won: currentLottery.type === "regular" ? 100 : 150,
			});

			allPromisesToBeResolved.push(
				prismaClient.wallet.update({
					where: {
						userId: firstPickedEntry.userId,
					},
					data: {
						current_balance: {
							increment: currentLottery.type === "regular" ? 100 : 150,
						},
					},
				})
			);
		}

		if (secondPickedEntry) {
			userWinnngTransactions.push({
				userId: secondPickedEntry.userId,
				amount: currentLottery.type === "regular" ? 50 : 100,
				transaction_type: "reward",
			});

			lotteryWinners.push({
				position: "second",
				practiceGameEntryId: secondPickedEntry.id,
				practiceGameId: currentLottery.id,
				userId: secondPickedEntry.userId,
				token_amount_won: currentLottery.type === "regular" ? 50 : 100,
			});

			allPromisesToBeResolved.push(
				prismaClient.wallet.update({
					where: {
						userId: secondPickedEntry.userId,
					},
					data: {
						current_balance: {
							increment: currentLottery.type === "regular" ? 50 : 100,
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

		const createPracticeGameWinnersPromise =
			lotteryWinners.length > 0
				? prismaClient.practiceGameWinner.createMany({
						data: lotteryWinners,
				  })
				: null;

		const updatePracticeGamePromise = prismaClient.practiceGame.update({
			where: {
				id: currentLottery.id,
			},
			data: {
				status: "closed",
			},
		});

		const createPracticeGamePromise = prismaClient.practiceGame.create({
			data: {
				type: requestBody.game_type,
				date: formatDate(new Date(), "dd/MM/yyyy"),
			},
		});

		allPromisesToBeResolved.push(
			createWinningTransactionsPromise,
			createPracticeGameWinnersPromise,
			updatePracticeGamePromise,
			createPracticeGamePromise
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
