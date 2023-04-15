import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { genSalt, hash } from "bcrypt";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { Prisma } from ".prisma/client";

const RequestBodySchema = z.object({
	email: z.string().email({ message: "Enter a valid email address" }),
	name: z
		.string()
		.min(3, { message: "Name should be at least 3 characters long" })
		.max(80, { message: "Name can be at max 80 characters long" }),
	password: z
		.string()
		.min(8, { message: "Password should be at least 8 characters long" })
		.max(30, { message: "Password can be at max 30 characters long" }),
	mobile_number: z
		.string()
		.min(10, { message: "A 10 digit mobile number is required" })
		.max(10, { message: "A 10 digit mobile number is required" }),
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
		const encryptionSalt = await genSalt(10);

		const hashedPassword = await hash(requestBody.password, encryptionSalt);

		const user = await prismaInstance.user.create({
			data: {
				email: requestBody.email,
				password: hashedPassword,
				mobile_number: requestBody.mobile_number,
				username: requestBody.email.split("@")[0] + "_atu",
			},
		});

		await prismaInstance.profile.create({
			data: {
				name: requestBody.name,
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
			let errorString;

			if (error.meta && error.meta["target"] === "User_email_key")
				errorString = "An account with this email already exists";
			else if (error.meta && error.meta["target"] === "User_mobile_number_key")
				errorString = "An account with this mobile number already exists";
			else errorString = error.cause ?? error.message;

			return res.status(400).json({
				success: false,
				error: errorString,
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
