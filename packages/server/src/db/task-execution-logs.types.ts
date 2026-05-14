import type { taskExecutionLogsTable } from "./task-execution-logs.schema";

export type TaskExecutionLogRow = typeof taskExecutionLogsTable.$inferSelect;
export type NewTaskExecutionLogRow = typeof taskExecutionLogsTable.$inferInsert;
