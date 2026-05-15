"use client";

import {
	BookOpen,
	Bot,
	ChartColumn,
	CircleHelp,
	CircleUserRound,
	Computer,
	Inbox,
	ListChecks,
	PanelLeft,
	PencilLine,
	Search,
	Settings,
	Sparkles,
	SquareKanban,
	UsersRound,
} from "lucide-react";
import type { ComponentType, ReactElement } from "react";

import type {
	SidebarDisplayMode,
	SidebarNavItem,
} from "@/components/web-shell/web-shell.types";
import { cn } from "@/lib/utils";

interface WebSidebarProps {
	mode: SidebarDisplayMode;
	activeKey: SidebarNavItem["key"];
	navItems: SidebarNavItem[];
	onNavSelect: (key: SidebarNavItem["key"]) => void;
	onNewIssue: () => void;
	onToggleMode: () => void;
}

const iconByKey: Record<
	SidebarNavItem["key"],
	ComponentType<{ size?: number }>
> = {
	agents: Bot,
	runtimes: Computer,
	skills: BookOpen,
	settings: Settings,
	issues: ListChecks,
	projects: SquareKanban,
	inbox: Inbox,
	autopilot: Sparkles,
	squads: UsersRound,
	usage: ChartColumn,
};

function nextSidebarLabel(mode: SidebarDisplayMode): string {
	if (mode === "expanded") {
		return "Collapse sidebar";
	}
	if (mode === "collapsed") {
		return "Hide sidebar";
	}
	return "Show sidebar";
}

export function WebSidebar({
	mode,
	activeKey,
	navItems,
	onNavSelect,
	onNewIssue,
	onToggleMode,
}: WebSidebarProps): ReactElement {
	const isExpanded = mode === "expanded";
	const isHidden = mode === "hidden";
	return (
		<aside
			aria-label="Primary navigation"
			className="grid h-[100dvh] max-h-[100dvh] border-r border-zinc-900 bg-[#15161a] text-zinc-400"
			style={{
				width: isHidden ? "0" : isExpanded ? "17.5rem" : "4.5rem",
				opacity: isHidden ? 0 : 1,
				pointerEvents: isHidden ? "none" : "auto",
				transition: "width 180ms ease, opacity 120ms ease",
				overflow: "hidden",
				gridTemplateRows: "auto auto 1fr auto",
			}}
		>
			<header className="flex items-center gap-3 p-4">
				<span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-zinc-700 bg-zinc-800 text-sm font-semibold text-zinc-200">
					R
				</span>
				{isExpanded ? (
					<strong className="truncate text-sm text-zinc-100">
						Roy Lee&apos;s Workspace
					</strong>
				) : null}
				<button
					aria-label={nextSidebarLabel(mode)}
					className="ml-auto grid h-8 w-8 place-items-center rounded-md hover:bg-zinc-800"
					onClick={onToggleMode}
					title={nextSidebarLabel(mode)}
					type="button"
				>
					<PanelLeft size={16} />
				</button>
			</header>
			<div className="grid gap-2 px-3 pb-4">
				<SidebarAction
					icon={Search}
					isExpanded={isExpanded}
					label="Search..."
				/>
				<SidebarAction
					icon={PencilLine}
					isExpanded={isExpanded}
					label="New Issue"
					onClick={onNewIssue}
				/>
			</div>
			<nav className="grid content-start gap-6 px-3">
				<NavGroup
					activeKey={activeKey}
					isExpanded={isExpanded}
					items={navItems.slice(0, 7)}
					onNavSelect={onNavSelect}
					title="Workspace"
				/>
				<NavGroup
					activeKey={activeKey}
					isExpanded={isExpanded}
					items={navItems.slice(7)}
					onNavSelect={onNavSelect}
					title="Configure"
				/>
			</nav>
			<footer className="flex items-center justify-between p-4">
				{isExpanded ? (
					<span className="text-xs text-zinc-500">devos.ing</span>
				) : null}
				<CircleHelp size={16} />
			</footer>
		</aside>
	);
}

function NavGroup({
	title,
	items,
	activeKey,
	isExpanded,
	onNavSelect,
}: {
	title: string;
	items: SidebarNavItem[];
	activeKey: SidebarNavItem["key"];
	isExpanded: boolean;
	onNavSelect: (key: SidebarNavItem["key"]) => void;
}): ReactElement {
	return (
		<div className="grid gap-1">
			{isExpanded ? (
				<p className="mb-1 px-2 text-xs font-semibold text-zinc-500">{title}</p>
			) : null}
			{items.map((item) => {
				const Icon = iconByKey[item.key];
				const isActive = item.key === activeKey;
				return (
					<button
						aria-current={isActive ? "page" : undefined}
						className={cn(
							"flex h-10 items-center gap-3 rounded-md px-2 text-sm font-medium",
							isActive
								? "bg-zinc-800 text-zinc-100"
								: "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200",
							!isExpanded && "justify-center",
						)}
						key={item.key}
						onClick={() => onNavSelect(item.key)}
						title={item.label}
						type="button"
					>
						<Icon size={18} />
						{isExpanded ? <span>{item.label}</span> : null}
					</button>
				);
			})}
		</div>
	);
}

function SidebarAction({
	icon: Icon,
	isExpanded,
	label,
	onClick,
}: {
	icon: ComponentType<{ size?: number }>;
	isExpanded: boolean;
	label: string;
	onClick?: () => void;
}): ReactElement {
	return (
		<button
			className={cn(
				"flex h-9 items-center gap-3 rounded-md px-2 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200",
				!isExpanded && "justify-center",
			)}
			onClick={onClick}
			type="button"
		>
			<Icon size={18} />
			{isExpanded ? <span>{label}</span> : null}
		</button>
	);
}
