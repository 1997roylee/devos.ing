import type { taskExecutionStepsTable } from "./task-execution-steps.schema";

export type TaskExecutionStepRow = typeof taskExecutionStepsTable.$inferSelect;
export type NewTaskExecutionStepRow =
	typeof taskExecutionStepsTable.$inferInsert;
