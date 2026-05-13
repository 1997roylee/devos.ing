import { readFile } from "node:fs/promises";
import type { TaskIntakeAnswer } from "./task-intake.types";

async function loadSkillText(filePath: string): Promise<string> {
	try {
		return (await readFile(filePath, "utf8")).trim();
	} catch {
		return "No task-intake skill file was found. Follow workflow instructions directly.";
	}
}

export async function buildTaskIntakePrompt(
	skillPath: string,
	request: string,
	answers: TaskIntakeAnswer[] = [],
): Promise<string> {
	const skill = await loadSkillText(skillPath);
	const answerSection =
		answers.length > 0
			? [
					"Clarifying answers so far:",
					...answers.flatMap((item, index) => [
						`${index + 1}. Q: ${item.question}`,
						`   A: ${item.answer}`,
					]),
				].join("\n")
			: "Clarifying answers so far: none";

	return [
		"You are the task-intake agent in the devos.ing ADHD (Agentic Development Hub & Daemon) workflow.",
		"Your job is to turn a loose operator request into one clear Linear backlog task.",
		"",
		"Use this skill:",
		skill,
		"",
		"Original request:",
		request.trim(),
		"",
		answerSection,
		"",
		"Decide whether the goal and requirements are clear enough to create one actionable Linear issue.",
		"Return the final section in exactly this contract:",
		"RESULT: CLEAR or NEEDS_INFO",
		'TASK_JSON: {"title":"...","description":"..."}',
		'QUESTIONS_JSON: ["..."]',
	].join("\n");
}
