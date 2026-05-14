import type { boardProjectsTable } from "./board-projects.schema";

export type BoardProjectRow = typeof boardProjectsTable.$inferSelect;
export type NewBoardProjectRow = typeof boardProjectsTable.$inferInsert;
