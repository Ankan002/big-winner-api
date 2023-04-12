import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";

export const startServer = () => {
	const app = express();
	const PORT = process.env["PORT"];

	app.use(cors());
	app.use(express.json());
	app.use(
		fileUpload({
			useTempFiles: true,
		})
	);

	app.get("/", (req, res) => {
		return res.status(200).json({
			success: true,
			message: "Welcome to Big Winner API...",
		});
	});

	app.listen(PORT, () => console.log(`App is running at PORT: ${PORT}`));
};
