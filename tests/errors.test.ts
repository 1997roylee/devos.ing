import { describe, expect, it } from "bun:test";
import {
	ADHDAiError,
	ConfigError,
	IntegrationError,
	StateError,
	ValidationError,
	WorkflowError,
	wrapError,
} from "../src/core/errors";

describe("ADHDAiError", () => {
	it("creates error with code and message", () => {
		const error = new ADHDAiError("TEST_CODE", "Test message");
		expect(error.code).toBe("TEST_CODE");
		expect(error.message).toBe("Test message");
		expect(error.name).toBe("ADHDAiError");
	});

	it("includes context when provided", () => {
		const error = new ADHDAiError("TEST_CODE", "Test", {
			context: { key: "value" },
		});
		expect(error.context).toEqual({ key: "value" });
	});

	it("preserves cause error", () => {
		const cause = new Error("Original error");
		const error = new ADHDAiError("TEST_CODE", "Wrapper", { cause });
		expect(error.cause).toBe(cause);
	});

	it("formats toString with context", () => {
		const error = new ADHDAiError("CODE", "Message", {
			context: { foo: "bar" },
		});
		expect(error.toString()).toContain("[CODE] Message");
		expect(error.toString()).toContain('{"foo":"bar"}');
	});

	it("formats toString with cause", () => {
		const cause = new Error("Cause message");
		const error = new ADHDAiError("CODE", "Message", { cause });
		expect(error.toString()).toContain("Caused by: Cause message");
	});
});

describe("ConfigError", () => {
	it("creates config error with code", () => {
		const error = new ConfigError("Invalid config");
		expect(error.code).toBe("CONFIG_ERROR");
		expect(error.name).toBe("ConfigError");
	});

	it("includes configKey in context", () => {
		const error = new ConfigError("Test", { configKey: "apiUrl" });
		expect(error.context?.configKey).toBe("apiUrl");
	});

	it("includes envVar in context", () => {
		const error = new ConfigError("Missing", { envVar: "API_KEY" });
		expect(error.context?.envVar).toBe("API_KEY");
	});

	it("includes projectId in context", () => {
		const error = new ConfigError("Invalid project", {
			projectId: "my-project",
		});
		expect(error.context?.projectId).toBe("my-project");
	});
});

describe("StateError", () => {
	it("creates state error with code", () => {
		const error = new StateError("State load failed");
		expect(error.code).toBe("STATE_ERROR");
		expect(error.name).toBe("StateError");
	});

	it("includes projectId in context", () => {
		const error = new StateError("Test", { projectId: "proj-1" });
		expect(error.context?.projectId).toBe("proj-1");
	});

	it("includes issueKey in context", () => {
		const error = new StateError("Test", { issueKey: "ENG-123" });
		expect(error.context?.issueKey).toBe("ENG-123");
	});

	it("includes filePath in context", () => {
		const error = new StateError("Test", { filePath: "/tmp/state.json" });
		expect(error.context?.filePath).toBe("/tmp/state.json");
	});
});

describe("IntegrationError", () => {
	it("creates integration error with code", () => {
		const error = new IntegrationError("API call failed");
		expect(error.code).toBe("INTEGRATION_ERROR");
		expect(error.name).toBe("IntegrationError");
	});

	it("includes service in context", () => {
		const error = new IntegrationError("Test", { service: "linear" });
		expect(error.context?.service).toBe("linear");
	});

	it("includes issueId in context", () => {
		const error = new IntegrationError("Test", { issueId: "lin_123" });
		expect(error.context?.issueId).toBe("lin_123");
	});

	it("sets retryable property", () => {
		const error1 = new IntegrationError("Test", { retryable: true });
		expect(error1.retryable).toBe(true);

		const error2 = new IntegrationError("Test", { retryable: false });
		expect(error2.retryable).toBe(false);

		const error3 = new IntegrationError("Test");
		expect(error3.retryable).toBe(false);
	});
});

describe("WorkflowError", () => {
	it("creates workflow error with code", () => {
		const error = new WorkflowError("Stage failed");
		expect(error.code).toBe("WORKFLOW_ERROR");
		expect(error.name).toBe("WorkflowError");
	});

	it("includes stage in context", () => {
		const error = new WorkflowError("Test", { stage: "implementing" });
		expect(error.context?.stage).toBe("implementing");
	});

	it("includes retryable property", () => {
		const error = new WorkflowError("Test", { retryable: true });
		expect(error.retryable).toBe(true);
	});
});

describe("ValidationError", () => {
	it("creates validation error with code", () => {
		const error = new ValidationError("Invalid input");
		expect(error.code).toBe("VALIDATION_ERROR");
		expect(error.name).toBe("ValidationError");
	});

	it("includes field in context", () => {
		const error = new ValidationError("Test", { field: "email" });
		expect(error.context?.field).toBe("email");
	});

	it("includes value in context", () => {
		const error = new ValidationError("Test", { value: 123 });
		expect(error.context?.value).toBe(123);
	});

	it("includes constraint in context", () => {
		const error = new ValidationError("Test", {
			constraint: "must be positive",
		});
		expect(error.context?.constraint).toBe("must be positive");
	});
});

describe("wrapError", () => {
	it("returns original if already ADHDAiError", () => {
		const original = new ConfigError("Original");
		const wrapped = wrapError(original, "OTHER", "Wrapped");
		expect(wrapped).toBe(original);
	});

	it("wraps Error with cause", () => {
		const original = new Error("Original error");
		const wrapped = wrapError(original, "CODE", "Wrapped");
		expect(wrapped).toBeInstanceOf(ADHDAiError);
		expect(wrapped.cause).toBe(original);
	});

	it("wraps non-Error as string", () => {
		const wrapped = wrapError("string error", "CODE", "Wrapped");
		expect(wrapped.context?.originalError).toBe("string error");
	});

	it("preserves context", () => {
		const original = new Error("Original");
		const wrapped = wrapError(original, "CODE", "Wrapped", {
			context: { extra: "data" },
		});
		expect(wrapped.context?.extra).toBe("data");
	});
});
