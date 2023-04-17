import formData from "form-data";
import Mailgun from "mailgun.js";

const MailgunClient = {
	mailgunClient: (() => {
		const mailgun = new Mailgun(formData);
		return mailgun.client({ username: "api", key: process.env["MAILGUN_API_KEY"] ?? "" });
	})(),
};

export const getMailgunClient = () => MailgunClient.mailgunClient;
