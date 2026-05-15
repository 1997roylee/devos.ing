import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const agentsTable = pgTable("agents", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	logo: text("logo").notNull(),
	runtime: text("runtime").notNull(),
	model: text("model").notNull(),
	concurrency: integer("concurrency").notNull(),
	owner: text("owner").notNull(),
	createdAt: timestamp("created_at", { mode: "string" }).notNull(),
	updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
	skills: text("skills").notNull(),
	recentWork: text("recent_work").notNull(),
	activity: text("activity").notNull(),
	instructions: text("instructions").notNull(),
});
