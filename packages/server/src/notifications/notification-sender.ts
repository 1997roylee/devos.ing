import type { NotificationServerRequest } from "adhdai/features/server";
import type { NotificationSenderOptions } from "./notification-sender.types";

const RESEND_API_URL = "https://api.resend.com/emails";

export function createNotificationSender(options: NotificationSenderOptions): {
	sendNotification(request: NotificationServerRequest): Promise<void>;
} {
	return {
		sendNotification: async (request) => {
			if (!options.resendApiKey) {
				throw new Error(
					"Server notifications require RESEND_API_KEY to be configured",
				);
			}
			const response = await fetch(RESEND_API_URL, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${options.resendApiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(request.payload),
			});
			if (!response.ok) {
				const body = (await response.text()).trim();
				const detail = body ? ` ${body}` : "";
				throw new Error(
					`Resend send failed with status ${response.status}.${detail}`.trim(),
				);
			}
		},
	};
}
