import { Request, Response } from "express";
import { getPrismaClient } from "utils/get-prisma-client";
import { compare } from "bcrypt";
import { z } from "zod";
import jwt from "jsonwebtoken";

const RequestBodySchema = z.object({
	email: z.string().email({ message: "Enter a valid email address" }),
	password: z
		.string()
		.min(8, { message: "Password should be at least 8 characters long" })
		.max(30, { message: "Password can be at max 30 characters long" }),
});

export const login = async (req: Request, res: Response) => {
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
		const user = await prismaInstance.user.findUnique({
			where: {
				email: requestBody.email,
			},
		});

		if (!user) {
			return res.status(401).json({
				success: false,
				error: "Email not registered!!",
			});
		}

		const isPasswordCorrect = await compare(requestBody.password, user.password);

		if (!isPasswordCorrect) {
			return res.status(401).json({
				success: false,
				error: "Access Denied!!",
			});
		}

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
		if (error instanceof Error) {
			return res.status(400).json({
				success: false,
				error: error.message,
			});
		}

		return res.status(500).json({
			success: false,
			error: "Internal Server Error!!",
		});
	}
};
