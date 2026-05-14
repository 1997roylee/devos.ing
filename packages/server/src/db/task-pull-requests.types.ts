import type { taskPullRequestsTable } from "./task-pull-requests.schema";

export type TaskPullRequestRow = typeof taskPullRequestsTable.$inferSelect;
export type NewTaskPullRequestRow = typeof taskPullRequestsTable.$inferInsert;
