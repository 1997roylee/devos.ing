import path from "node:path";

export const repoRoot = path.resolve(import.meta.dir, "../../..");
export const repoSkillsRoot = path.join(repoRoot, "skills");

export function repoSkillPath(...segments: string[]): string {
	return path.join(repoSkillsRoot, ...segments);
}
