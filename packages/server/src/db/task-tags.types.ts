import type { taskTagsTable } from "./task-tags.schema";

export type TaskTagRow = typeof taskTagsTable.$inferSelect;
export type NewTaskTagRow = typeof taskTagsTable.$inferInsert;
