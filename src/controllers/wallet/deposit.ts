import { Prisma } from ".prisma/client";
import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { logger } from "utils/logger";
import { z } from "zod";

const RequestBodySchema = z.object({
	token_amount: z.number().min(1, { message: "Please add at least one token" }),
	microservice_password: z.string(),
});

export const deposit = async (req: Request, res: Response) => {
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

	if (requestBody.microservice_password !== process.env["MICROSERVICE_PASSWORD"]) {
		return res.status(401).json({
			success: false,
			error: "Access Denied!!",
		});
	}

	try {
		const retrievedUser = await prismaInstance.user.findUnique({
			where: {
				id: user.id,
			},
			select: {
				id: true,
				email_verified: true,
				referred_by: {
					select: {
						id: true,
						referred_by: {
							select: {
								id: true,
							},
						},
					},
				},
			},
		});

		if (!retrievedUser) {
			return res.status(400).json({
				success: false,
				error: "User not found!!",
			});
		}

		if (!retrievedUser.email_verified) {
			return res.status(400).json({
				success: false,
				error: "Email not verified!!",
			});
		}

		let bonusAmount = 0;

		if (requestBody.token_amount >= 200 && requestBody.token_amount <= 2000) {
			bonusAmount = 0.05 * requestBody.token_amount;
		} else if (requestBody.token_amount > 2000 && requestBody.token_amount <= 10000) {
			bonusAmount = 0.1 * requestBody.token_amount;
		} else if (requestBody.token_amount > 10000) {
			bonusAmount = 0.15 * requestBody.token_amount;
		}

		// * Promise to update wallet of the current user. Also we are inclusing the call for bonus amount in the same call.
		const updateCurrentUserWalletPromise = prismaInstance.wallet.update({
			where: {
				userId: retrievedUser.id,
			},
			data: {
				current_balance: {
					increment: requestBody.token_amount,
				},
				bonus_balance: {
					increment: bonusAmount,
				},
			},
		});

		// * Promise to update the wallet of the parent user with given constraints if the parent user exists else its null.
		const updateFirstLevelUserWalletPromise = retrievedUser.referred_by
			? prismaInstance.wallet.update({
					where: {
						userId: retrievedUser.referred_by.id,
					},
					data: {
						bonus_balance: {
							increment: 0.01 * requestBody.token_amount,
						},
					},
			  })
			: null;

		// * Promise to update the wallet of the parent of parent user with given constraints if the parent of parent user exists else its null.
		const updateSecondLevelUserWalletPromise = retrievedUser.referred_by?.referred_by
			? prismaInstance.wallet.update({
					where: {
						userId: retrievedUser.referred_by.referred_by.id,
					},
					data: {
						bonus_balance: {
							increment: 0.015 * requestBody.token_amount,
						},
					},
			  })
			: null;

		// * Initializing an array that consist all the transactions that needs to be created to complete the process and this would be responsible of a createMany call.
		const userTransactionsData: Prisma.Enumerable<Prisma.TransactionCreateManyInput> = [];

		// * Here we are pushing the transaction data for depositing token to user's wallet into userTransactionsData.
		userTransactionsData.push({
			amount: requestBody.token_amount,
			transaction_type: "deposit",
			userId: retrievedUser.id,
		});

		// * Here we are pushing the transaction data for deposit bonus token to user's wallet into userTransactionsData if bonusAmount > 0.
		if (bonusAmount > 0) {
			userTransactionsData.push({
				amount: bonusAmount,
				transaction_type: "bonus",
				userId: retrievedUser.id,
			});
		}

		// * Here we are pushing the transaction data for deposit bonus token to user's parent's wallet if he exists.
		if (retrievedUser.referred_by) {
			userTransactionsData.push({
				amount: 0.01 * requestBody.token_amount,
				transaction_type: "bonus",
				userId: retrievedUser.referred_by.id,
			});
		}

		// * Here we are pushing the transaction data for deposit bonus token to wallet of parent of parent of user if he exists.
		if (retrievedUser.referred_by?.referred_by) {
			userTransactionsData.push({
				amount: 0.015 * requestBody.token_amount,
				transaction_type: "bonus",
				userId: retrievedUser.referred_by.referred_by.id,
			});
		}

		// * Now we create a promise with all transaction data in a createMany call to create all records al once.
		const creatUserTransactionsPromise = prismaInstance.transaction.createMany({
			data: userTransactionsData,
		});

		// * Finally we await for all the promises that we created in a parallel manner using Promise.all()
		await Promise.all([
			updateCurrentUserWalletPromise,
			updateFirstLevelUserWalletPromise,
			updateSecondLevelUserWalletPromise,
			creatUserTransactionsPromise,
		]);

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
			error: "Internal Server Error",
		});
	}
};
