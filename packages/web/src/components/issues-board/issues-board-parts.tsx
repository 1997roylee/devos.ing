"use client";

import { Bot, CheckCircle2, Circle, MoreHorizontal, Plus } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import type {
	ProjectBoardStatusColumn,
	ProjectBoardTaskRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import { IssuesBoardSkeleton } from "./issues-board-skeleton";
import { getStatusLabel, isAgentTask } from "./issues-board-utils";
import { STATUS_ORDER, STATUS_PRESENTATION } from "./issues-board.constants";
import type { IssueTab } from "./issues-board.types";

export function BoardHeader({
	activeTab,
	onTabChange,
	onCreateIssue,
}: {
	activeTab: IssueTab;
	onTabChange: (tab: IssueTab) => void;
	onCreateIssue: () => void;
}): ReactElement {
	return (
		<header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 bg-[#111216] px-5 py-4">
			<div>
				<p className="mb-1 text-sm text-zinc-500">Roy Lee&apos;s Workspace /</p>
				<h1 className="m-0 text-xl font-semibold">Issues</h1>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{(["all", "members", "agents"] as const).map((tab) => (
					<button
						className={cn(
							"rounded-md border px-3 py-2 text-sm capitalize",
							activeTab === tab
								? "border-zinc-600 bg-zinc-800 text-white"
								: "border-zinc-800 text-zinc-400 hover:bg-zinc-900",
						)}
						key={tab}
						onClick={() => onTabChange(tab)}
						type="button"
					>
						{tab}
					</button>
				))}
				<button
					className="issue-primary-button"
					onClick={onCreateIssue}
					type="button"
				>
					<Plus size={16} />
					New Issue
				</button>
			</div>
		</header>
	);
}

export function ToolButton({
	icon,
	label,
	onClick,
}: {
	icon: ReactNode;
	label: string;
	onClick: () => void;
}): ReactElement {
	return (
		<button className="issue-tool-button" onClick={onClick} type="button">
			{icon}
			<span>{label}</span>
		</button>
	);
}

export function ColumnToggles({
	visibleStatuses,
	onToggle,
}: {
	visibleStatuses: string[];
	onToggle: (status: string) => void;
}): ReactElement {
	return (
		<div className="flex gap-2 overflow-x-auto border-b border-zinc-900 px-5 py-2">
			{STATUS_ORDER.map((status) => (
				<button
					className={cn(
						"whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs",
						visibleStatuses.includes(status)
							? "border-zinc-600 text-zinc-100"
							: "border-zinc-900 text-zinc-500",
					)}
					key={status}
					onClick={() => onToggle(status)}
					type="button"
				>
					{getStatusLabel(status)}
				</button>
			))}
		</div>
	);
}

export function BoardContent({
	columns,
	error,
	isLoading,
	onCreateIssue,
	onOpenIssue,
}: {
	columns: ProjectBoardStatusColumn[];
	error: Error | null;
	isLoading: boolean;
	onCreateIssue: (status: string) => void;
	onOpenIssue: (task: ProjectBoardTaskRecord) => void;
}): ReactElement {
	if (isLoading) {
		return <IssuesBoardSkeleton />;
	}
	if (error) {
		return <BoardState label={error.message} />;
	}
	if (columns.length === 0) {
		return <BoardState label="No columns selected" />;
	}
	return (
		<div className="flex h-[calc(100dvh-10.5rem)] gap-4 overflow-x-auto px-5 py-4">
			{columns.map((column) => (
				<IssueColumn
					column={column}
					key={column.status}
					onCreateIssue={onCreateIssue}
					onOpenIssue={onOpenIssue}
				/>
			))}
		</div>
	);
}

function BoardState({ label }: { label: string }): ReactElement {
	return (
		<div className="grid min-h-[24rem] place-items-center text-sm text-zinc-500">
			{label}
		</div>
	);
}

function IssueColumn({
	column,
	onCreateIssue,
	onOpenIssue,
}: {
	column: ProjectBoardStatusColumn;
	onCreateIssue: (status: string) => void;
	onOpenIssue: (task: ProjectBoardTaskRecord) => void;
}): ReactElement {
	const tone = STATUS_PRESENTATION[column.status]?.tone ?? "bg-[#17181c]";
	return (
		<section
			className={cn(
				"flex h-full w-[23rem] shrink-0 flex-col rounded-lg border p-3",
				tone,
			)}
		>
			<header className="mb-4 flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Circle className="text-zinc-500" size={15} />
					<h2 className="m-0 text-sm font-semibold">
						{getStatusLabel(column.status)}
					</h2>
					<span className="text-sm text-zinc-500">{column.tasks.length}</span>
				</div>
				<div className="flex items-center gap-1">
					<button className="issue-icon-button" type="button">
						<MoreHorizontal size={16} />
					</button>
					<button
						aria-label={`Add ${getStatusLabel(column.status)} issue`}
						className="issue-icon-button"
						onClick={() => onCreateIssue(column.status)}
						type="button"
					>
						<Plus size={16} />
					</button>
				</div>
			</header>
			<div className="grid content-start gap-3 overflow-y-auto pr-1">
				{column.tasks.length === 0 ? (
					<p className="mt-16 text-center text-sm text-zinc-500">No issues</p>
				) : (
					column.tasks.map((task) => (
						<IssueCard key={task.id} onOpenIssue={onOpenIssue} task={task} />
					))
				)}
			</div>
		</section>
	);
}

function IssueCard({
	task,
	onOpenIssue,
}: {
	task: ProjectBoardTaskRecord;
	onOpenIssue: (task: ProjectBoardTaskRecord) => void;
}): ReactElement {
	return (
		<button
			className="rounded-lg border border-zinc-800 bg-[#1b1c21] p-3 text-left shadow-sm hover:border-zinc-700"
			onClick={() => onOpenIssue(task)}
			type="button"
		>
			<p className="mb-2 text-xs font-medium text-zinc-500">{task.id}</p>
			<h3 className="m-0 line-clamp-2 text-sm font-semibold text-zinc-100">
				{task.title}
			</h3>
			<p className="mb-3 mt-2 line-clamp-2 text-sm text-zinc-500">
				{task.content}
			</p>
			<div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
				<span className="rounded-md bg-zinc-800 px-2 py-1">
					P{task.priority}
				</span>
				<span className="rounded-md bg-zinc-800 px-2 py-1">
					{task.creatorId}
				</span>
				{isAgentTask(task) ? <Bot size={14} /> : <CheckCircle2 size={14} />}
			</div>
		</button>
	);
}
