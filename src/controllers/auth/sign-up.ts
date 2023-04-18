import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { genSalt, hash } from "bcrypt";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { Prisma, User } from ".prisma/client";
import { v4 as uuidv4 } from "uuid";

const RequestBodySchema = z.object({
	email: z.string().email({ message: "Enter a valid email address" }),
	name: z
		.string()
		.trim()
		.min(3, { message: "Name should be at least 3 characters long" })
		.max(80, { message: "Name can be at max 80 characters long" }),
	password: z
		.string()
		.trim()
		.min(8, { message: "Password should be at least 8 characters long" })
		.max(30, { message: "Password can be at max 30 characters long" }),
	mobile_number: z
		.string()
		.trim()
		.min(10, { message: "A 10 digit mobile number is required" })
		.max(10, { message: "A 10 digit mobile number is required" }),
	refer_code: z.string().uuid({ message: "A referral code should be UUID" }).trim().optional(),
});

export const signUp = async (req: Request, res: Response) => {
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
		let referred_by: User | null = null;

		if (requestBody.refer_code) {
			referred_by = await prismaInstance.user.findUnique({
				where: {
					refer_code: requestBody.refer_code.trim(),
				},
			});

			if (!referred_by) {
				return res.status(400).json({
					success: false,
					error: "Invalid refer code please check it once, also you can sign up without a refer code",
				});
			}
		}

		const encryptionSalt = await genSalt(10);

		const hashedPassword = await hash(requestBody.password.trim(), encryptionSalt);

		const user = await prismaInstance.user.create({
			data: {
				email: requestBody.email.trim(),
				password: hashedPassword,
				mobile_number: requestBody.mobile_number.trim(),
				username: requestBody.email.trim().split("@")[0] + "_atu",
				refer_code: uuidv4(),
				referred_by_id: referred_by ? referred_by.id : null,
			},
		});

		await prismaInstance.profile.create({
			data: {
				name: requestBody.name.trim(),
				avatar: `https://api.dicebear.com/5.x/avataaars/png?seed=${user.username}`,
				userId: user.id,
			},
		});

		const jwtData = {
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
			},
		};

		const jwtToken = jwt.sign(jwtData, process.env["JWT_SECRET"] ?? "");

		return res.status(200).setHeader("auth-token", jwtToken).json({
			success: true,
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return res.status(400).json({
				success: false,
				error: "Either an user with same email or mobile number already exists",
			});
		}

		if (error instanceof Error) {
			return res.status(400).json({
				success: false,
				error: error.message,
			});
		}

		return res.status(500).json({
			success: false,
			error: "Internal Server Error",
		});
	}
};
