import { createClient } from "redis";
import { logger } from "utils/logger";

const RedisClient = {
	client: (() => {
		const redisClient = createClient({
			password: process.env["REDIS_CLIENT_PASSWORD"] ?? "",
			socket: {
				host: process.env["REDIS_CLIENT_HOST"],
				port: Number(process.env["REDIS_CLIENT_PORT"] ?? ""),
			},
		});

		redisClient.on("error", (error) => {
			if (error instanceof Error) {
				logger.error(error.message);
				return;
			}

			logger.error(error);
		});

		return redisClient;
	})(),
};

export const getRedisClient = () => RedisClient.client;
