import type { projectBoardsTable } from "./project-boards.schema";

export type ProjectBoardRow = typeof projectBoardsTable.$inferSelect;
export type NewProjectBoardRow = typeof projectBoardsTable.$inferInsert;
