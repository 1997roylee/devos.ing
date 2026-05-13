import type { taskCommentsTable } from "./task-comments.schema";

export type TaskCommentRow = typeof taskCommentsTable.$inferSelect;
export type NewTaskCommentRow = typeof taskCommentsTable.$inferInsert;
