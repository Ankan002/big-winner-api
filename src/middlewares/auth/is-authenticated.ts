import { NextFunction, Request, Response } from "express";
import { JwtPayload, verify as jwtVerify } from "jsonwebtoken";
import { logger } from "utils/logger";

interface UserJwtPayload extends JwtPayload {
	user: {
		id: string;
		email: string;
		username: string;
	};
}

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
	const authToken = req.headers["auth-token"];

	if (!authToken) {
		return res.status(401).json({
			success: false,
			error: "Access Denied!!",
		});
	}

	try {
		const data = jwtVerify(authToken as string, process.env["JWT_SECRET"] ?? "") as UserJwtPayload;

		req.user = data.user;

		return next();
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
