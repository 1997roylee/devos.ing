export function extractMarkerJsonArray(
	output: string,
	markerName: string,
): string | undefined {
	const marker = new RegExp(`\\b${markerName}\\s*:`, "i");
	const markerMatch = marker.exec(output);
	if (!markerMatch) {
		return undefined;
	}
	const rawPayload = output.slice(markerMatch.index + markerMatch[0].length);
	const source = unwrapFencedCodeBlock(rawPayload.trim());
	return extractFirstJsonArray(source) ?? undefined;
}

export function unwrapFencedCodeBlock(input: string): string {
	if (!input.startsWith("```")) {
		return input;
	}
	const firstNewline = input.indexOf("\n");
	if (firstNewline === -1) {
		return input;
	}
	const closingFence = input.indexOf("\n```", firstNewline + 1);
	if (closingFence === -1) {
		return input.slice(firstNewline + 1);
	}
	return input.slice(firstNewline + 1, closingFence).trim();
}

export function extractFirstJsonArray(input: string): string | null {
	const start = input.indexOf("[");
	if (start === -1) {
		return null;
	}
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < input.length; i += 1) {
		const char = input[i];
		if (!char) {
			continue;
		}
		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (char === "\\") {
				escaped = true;
				continue;
			}
			if (char === '"') {
				inString = false;
			}
			continue;
		}
		if (char === '"') {
			inString = true;
			continue;
		}
		if (char === "[") {
			depth += 1;
			continue;
		}
		if (char === "]") {
			depth -= 1;
			if (depth === 0) {
				return input.slice(start, i + 1);
			}
		}
	}
	return null;
}

export function extractFirstJsonObject(input: string): string | null {
	const start = input.indexOf("{");
	if (start === -1) {
		return null;
	}
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < input.length; i += 1) {
		const char = input[i];
		if (!char) {
			continue;
		}
		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (char === "\\") {
				escaped = true;
				continue;
			}
			if (char === '"') {
				inString = false;
			}
			continue;
		}
		if (char === '"') {
			inString = true;
			continue;
		}
		if (char === "{") {
			depth += 1;
			continue;
		}
		if (char === "}") {
			depth -= 1;
			if (depth === 0) {
				return input.slice(start, i + 1);
			}
		}
	}
	return null;
}
