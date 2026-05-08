/**
 * Custom error classes for ADHD.ai with context preservation.
 * Replaces silent error handling with typed, context-aware errors.
 */

/**
 * Base error class for all ADHD.ai errors.
 * Preserves context about where and why the error occurred.
 */
export class ADHDAiError extends Error {
	public readonly code: string;
	public readonly context?: Record<string, unknown>;
	public readonly cause?: Error;

	constructor(
		code: string,
		message: string,
		options?: { context?: Record<string, unknown>; cause?: Error },
	) {
		super(message);
		this.name = "ADHDAiError";
		this.code = code;
		this.context = options?.context;
		this.cause = options?.cause;

		// Maintains proper stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Get a string representation of the error with context.
	 */
	public toString(): string {
		let result = `[${this.code}] ${this.message}`;
		if (this.context && Object.keys(this.context).length > 0) {
			const contextStr = JSON.stringify(this.context);
			result += ` (context: ${contextStr})`;
		}
		if (this.cause) {
			result += `\nCaused by: ${this.cause.message}`;
		}
		return result;
	}
}

/**
 * Error for configuration-related issues.
 * Includes details about which config key or environment variable failed.
 */
export class ConfigError extends ADHDAiError {
	constructor(
		message: string,
		options?: {
			configKey?: string;
			envVar?: string;
			projectId?: string;
			cause?: Error;
		},
	) {
		const context: Record<string, unknown> = {};
		if (options?.configKey) context.configKey = options.configKey;
		if (options?.envVar) context.envVar = options.envVar;
		if (options?.projectId) context.projectId = options.projectId;

		super("CONFIG_ERROR", message, { context, cause: options?.cause });
		this.name = "ConfigError";
	}
}

/**
 * Error for state persistence and retrieval issues.
 * Covers run-state file I/O and legacy fallback scenarios.
 */
export class StateError extends ADHDAiError {
	constructor(
		message: string,
		options?: {
			projectId?: string;
			issueKey?: string;
			filePath?: string;
			cause?: Error;
		},
	) {
		const context: Record<string, unknown> = {};
		if (options?.projectId) context.projectId = options.projectId;
		if (options?.issueKey) context.issueKey = options.issueKey;
		if (options?.filePath) context.filePath = options.filePath;

		super("STATE_ERROR", message, { context, cause: options?.cause });
		this.name = "StateError";
	}
}

/**
 * Error for external integration failures.
 * Covers Linear, GitHub, Codex, and notification service errors.
 */
export class IntegrationError extends ADHDAiError {
	constructor(
		message: string,
		options?: {
			service?: "linear" | "github" | "codex" | "claude-code" | "notifications";
			issueId?: string;
			projectId?: string;
			retryable?: boolean;
			cause?: Error;
		},
	) {
		const context: Record<string, unknown> = {};
		if (options?.service) context.service = options.service;
		if (options?.issueId) context.issueId = options.issueId;
		if (options?.projectId) context.projectId = options.projectId;
		if (options?.retryable !== undefined) context.retryable = options.retryable;

		super("INTEGRATION_ERROR", message, { context, cause: options?.cause });
		this.name = "IntegrationError";
		this.retryable = options?.retryable ?? false;
	}

	public readonly retryable: boolean;
}

/**
 * Error for workflow execution issues.
 * Covers stage transitions, agent execution, and retry logic.
 */
export class WorkflowError extends ADHDAiError {
	constructor(
		message: string,
		options?: {
			projectId?: string;
			issueKey?: string;
			stage?: string;
			retryable?: boolean;
			cause?: Error;
		},
	) {
		const context: Record<string, unknown> = {};
		if (options?.projectId) context.projectId = options.projectId;
		if (options?.issueKey) context.issueKey = options.issueKey;
		if (options?.stage) context.stage = options.stage;
		if (options?.retryable !== undefined) context.retryable = options.retryable;

		super("WORKFLOW_ERROR", message, { context, cause: options?.cause });
		this.name = "WorkflowError";
		this.retryable = options?.retryable ?? false;
	}

	public readonly retryable: boolean;
}

/**
 * Error for validation failures.
 * Covers input validation and schema violations.
 */
export class ValidationError extends ADHDAiError {
	constructor(
		message: string,
		options?: {
			field?: string;
			value?: unknown;
			constraint?: string;
			cause?: Error;
		},
	) {
		const context: Record<string, unknown> = {};
		if (options?.field) context.field = options.field;
		if (options?.value !== undefined) context.value = options.value;
		if (options?.constraint) context.constraint = options.constraint;

		super("VALIDATION_ERROR", message, { context, cause: options?.cause });
		this.name = "ValidationError";
	}
}

/**
 * Helper to wrap errors with ADHDAiError type.
 * Preserves the original error as cause.
 */
export function wrapError(
	original: unknown,
	code: string,
	message: string,
	options?: { context?: Record<string, unknown> },
): ADHDAiError {
	if (original instanceof ADHDAiError) {
		return original;
	}
	if (original instanceof Error) {
		return new ADHDAiError(code, message, {
			...options,
			cause: original,
		});
	}
	return new ADHDAiError(code, message, {
		...options,
		context: {
			...options?.context,
			originalError: String(original),
		},
	});
}
