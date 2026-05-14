import type { projectCronJobsTable } from "./project-cron-jobs.schema";

export type ProjectCronJobRow = typeof projectCronJobsTable.$inferSelect;
export type NewProjectCronJobRow = typeof projectCronJobsTable.$inferInsert;
