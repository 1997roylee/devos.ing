export type SidebarDisplayMode = "expanded" | "collapsed" | "hidden";

export interface SidebarNavItem {
	key:
		| "agents"
		| "runtimes"
		| "skills"
		| "settings"
		| "issues"
		| "projects"
		| "inbox"
		| "autopilot";
	label: string;
}
