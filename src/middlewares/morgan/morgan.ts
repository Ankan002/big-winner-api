import morgan, { StreamOptions } from "morgan";
import { logger } from "utils/logger";

const stream: StreamOptions = {
	write: (message) => logger.http(message),
};

export const morganConfig = morgan(":method :url :status - :response-time ms - :res[error]", { stream });
