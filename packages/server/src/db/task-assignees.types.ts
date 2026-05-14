import type { taskAssigneesTable } from "./task-assignees.schema";

export type TaskAssigneeRow = typeof taskAssigneesTable.$inferSelect;
export type NewTaskAssigneeRow = typeof taskAssigneesTable.$inferInsert;
