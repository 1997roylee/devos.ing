import type {
	CliDispatchStreamEvent,
	CliDispatchStreamHandler,
	CliDispatchStreamRequest,
	HealthRequestOptions,
} from "./client.types";

export interface DispatchStreamApiMethods {
	streamCliDispatch(
		request: CliDispatchStreamRequest,
		onEvent: CliDispatchStreamHandler,
		options?: HealthRequestOptions,
	): Promise<void>;
}

export function createDispatchStreamApiMethods(
	baseUrl: string,
	fetchFn: typeof fetch,
	headers: HeadersInit | undefined,
): DispatchStreamApiMethods {
	return {
		async streamCliDispatch(request, onEvent, options) {
			const requestHeaders = new Headers(headers);
			requestHeaders.set("accept", "text/event-stream");
			if (!requestHeaders.has("content-type")) {
				requestHeaders.set("content-type", "application/json");
			}
			const response = await fetchFn(`${baseUrl}/api/cli/dispatch`, {
				method: "POST",
				headers: requestHeaders,
				signal: options?.signal,
				body: JSON.stringify({ ...request, stream: true }),
			});
			if (!response.ok) {
				throw new Error(
					`/api/cli/dispatch request failed with status ${response.status}`,
				);
			}
			if (!response.body) {
				throw new Error("/api/cli/dispatch stream response is empty");
			}
			await readEventStream(response.body, onEvent);
		},
	};
}

async function readEventStream(
	body: ReadableStream<Uint8Array>,
	onEvent: CliDispatchStreamHandler,
): Promise<void> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			buffer += decoder.decode(value, { stream: !done });
			buffer = emitCompleteEventBlocks(buffer, onEvent);
			if (done) {
				break;
			}
		}
		if (buffer.trim()) {
			emitEventBlock(buffer, onEvent);
		}
	} finally {
		reader.releaseLock();
	}
}

function emitCompleteEventBlocks(
	buffer: string,
	onEvent: CliDispatchStreamHandler,
): string {
	let remaining = buffer;
	let separatorIndex = remaining.indexOf("\n\n");
	while (separatorIndex !== -1) {
		emitEventBlock(remaining.slice(0, separatorIndex), onEvent);
		remaining = remaining.slice(separatorIndex + 2);
		separatorIndex = remaining.indexOf("\n\n");
	}
	return remaining;
}

function emitEventBlock(
	block: string,
	onEvent: CliDispatchStreamHandler,
): void {
	const eventName = readSseField(block, "event");
	const data = readSseField(block, "data");
	if (!eventName || !data) {
		return;
	}
	const payload = JSON.parse(data) as Record<string, unknown>;
	onEvent({ type: eventName, ...payload } as CliDispatchStreamEvent);
}

function readSseField(block: string, field: string): string | undefined {
	const prefix = `${field}: `;
	const values = block
		.split("\n")
		.filter((line) => line.startsWith(prefix))
		.map((line) => line.slice(prefix.length));
	return values.length > 0 ? values.join("\n") : undefined;
}
