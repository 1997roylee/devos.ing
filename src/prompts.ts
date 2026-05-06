import { readFile } from "node:fs/promises";
import type { IssueRef, PullRequestRef } from "./types";

async function loadSkillText(filePath: string): Promise<string> {
	try {
		return (await readFile(filePath, "utf8")).trim();
	} catch {
		return "No skill file was found. Follow workflow instructions directly.";
	}
}

export async function buildPlanPrompt(
	skillPath: string,
	issue: IssueRef,
): Promise<string> {
	const skill = await loadSkillText(skillPath);
	return [
		"You are the planning agent in a PIV loop workflow.",
		"",
		"Use this skill:",
		skill,
		"",
		`Linear issue: ${issue.key}`,
		`Title: ${issue.title}`,
		`URL: ${issue.url}`,
		"",
		"Create a concrete implementation plan and include risks and tests.",
	].join("\n");
}

export async function buildImplementPrompt(
	skillPath: string,
	issue: IssueRef,
	planSummary: string,
): Promise<string> {
	const skill = await loadSkillText(skillPath);
	return [
		"You are the implementation agent in a PIV loop workflow.",
		"",
		"Use this skill:",
		skill,
		"",
		`Linear issue: ${issue.key}`,
		`Title: ${issue.title}`,
		"",
		"Plan summary:",
		planSummary,
		"",
		"Implement the task in the current workspace and run relevant tests. End with a concise summary.",
	].join("\n");
}

export async function buildReviewPrompt(
	skillPath: string,
	issue: IssueRef,
	pr: PullRequestRef | undefined,
): Promise<string> {
	const skill = await loadSkillText(skillPath);
	const prText = pr?.url
		? `PR: ${pr.url}`
		: `Branch: ${pr?.branch ?? "unknown"}`;
	return [
		"You are the review and testing agent in a PIV loop workflow.",
		"",
		"Use this skill:",
		skill,
		"",
		`Linear issue: ${issue.key}`,
		prText,
		"",
		"Review code changes and execute tests where possible.",
		"Return your final section in this exact format:",
		"RESULT: PASS or FAIL",
		"SUMMARY: <one-paragraph summary>",
		"BUGS_JSON:",
		'[{"title":"short bug title","body":"technical details"}]',
	].join("\n");
}
