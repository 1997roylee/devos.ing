import type { boardTasksTable } from "./board-tasks.schema";

export type BoardTaskRow = typeof boardTasksTable.$inferSelect;
export type NewBoardTaskRow = typeof boardTasksTable.$inferInsert;
