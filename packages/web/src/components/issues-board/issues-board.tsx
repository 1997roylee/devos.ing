"use client";

import { Columns3, Filter, SlidersHorizontal } from "lucide-react";
import { type ReactElement, useEffect, useMemo, useState } from "react";

import { TaskCreateChatDialog } from "@/components/task-create/task-create-chat-dialog";
import type { ProjectBoardTaskRecord, TaskMutationRequest } from "@/lib/api";
import {
	useCreateBoardTaskMutation,
	useDeleteBoardTaskMutation,
	useProjectBoardQuery,
	useUpdateBoardTaskMutation,
	useWorkspaceProjectsQuery,
} from "@/lib/api/queries";

import { IssueDialog } from "./issue-dialog";
import {
	BoardContent,
	BoardHeader,
	ColumnToggles,
	ToolButton,
} from "./issues-board-parts";
import { filterTaskByTab, sortColumns } from "./issues-board-utils";
import { DEFAULT_WORKSPACE_ID, STATUS_ORDER } from "./issues-board.constants";
import type { IssueDialogState, IssueTab } from "./issues-board.types";

interface IssuesBoardProps {
	createIssueRequest: number;
}

export function IssuesBoard({
	createIssueRequest,
}: IssuesBoardProps): ReactElement {
	const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);
	const [projectId, setProjectId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<IssueTab>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [sortNewestFirst, setSortNewestFirst] = useState(true);
	const [visibleStatuses, setVisibleStatuses] = useState<string[]>([
		...STATUS_ORDER,
	]);
	const [dialog, setDialog] = useState<IssueDialogState>(null);
	const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const projectsQuery = useWorkspaceProjectsQuery(workspaceId);
	const selectedProjectId = projectId ?? projectsQuery.data?.[0]?.id ?? null;
	const selectedProject = projectsQuery.data?.find(
		(project) => project.id === selectedProjectId,
	);
	const boardQuery = useProjectBoardQuery(workspaceId, selectedProjectId);
	const createTask = useCreateBoardTaskMutation(workspaceId, selectedProjectId);
	const updateTask = useUpdateBoardTaskMutation(workspaceId, selectedProjectId);
	const deleteTask = useDeleteBoardTaskMutation(workspaceId, selectedProjectId);

	useEffect(() => {
		if (!projectId && projectsQuery.data?.[0]) {
			setProjectId(projectsQuery.data[0].id);
		}
	}, [projectId, projectsQuery.data]);

	useEffect(() => {
		if (createIssueRequest > 0) {
			setIsChatDialogOpen(true);
		}
	}, [createIssueRequest]);

	const columns = useMemo(() => {
		return sortColumns(boardQuery.data?.statusColumns ?? [])
			.filter((column) => visibleStatuses.includes(column.status))
			.map((column) => ({
				...column,
				tasks: column.tasks
					.filter((task) => filterTaskByTab(task, activeTab))
					.filter((task) => matchesSearch(task, searchQuery))
					.sort((left, right) =>
						sortNewestFirst
							? right.createdAt.localeCompare(left.createdAt)
							: left.createdAt.localeCompare(right.createdAt),
					),
			}));
	}, [
		activeTab,
		boardQuery.data,
		searchQuery,
		sortNewestFirst,
		visibleStatuses,
	]);

	const taskCount = columns.reduce(
		(sum, column) => sum + column.tasks.length,
		0,
	);
	const dialogStatus =
		dialog?.mode === "create"
			? dialog.status
			: (dialog?.task.status ?? "planning");

	async function submitDialog(input: TaskMutationRequest): Promise<void> {
		setMutationError(null);
		try {
			if (dialog?.mode === "edit") {
				await updateTask.mutateAsync({ taskId: dialog.task.id, task: input });
			} else {
				await createTask.mutateAsync(input);
			}
			setDialog(null);
		} catch (error) {
			setMutationError(error instanceof Error ? error.message : "Save failed");
		}
	}

	async function deleteDialogTask(): Promise<void> {
		if (dialog?.mode !== "edit") {
			return;
		}
		setMutationError(null);
		try {
			await deleteTask.mutateAsync(dialog.task.id);
			setDialog(null);
		} catch (error) {
			setMutationError(
				error instanceof Error ? error.message : "Delete failed",
			);
		}
	}

	return (
		<section className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#0f1013] text-zinc-100">
			<BoardHeader
				activeTab={activeTab}
				onTabChange={setActiveTab}
				onCreateIssue={() => setIsChatDialogOpen(true)}
			/>
			<div className="flex flex-wrap items-center gap-3 border-b border-zinc-900 px-5 py-3">
				<input
					aria-label="Workspace ID"
					className="issue-input h-9 max-w-44"
					onChange={(event) => {
						setWorkspaceId(event.target.value);
						setProjectId(null);
					}}
					value={workspaceId}
				/>
				<select
					aria-label="Project"
					className="issue-input h-9 max-w-56"
					onChange={(event) => setProjectId(event.target.value)}
					value={selectedProjectId ?? ""}
				>
					{projectsQuery.data?.map((project) => (
						<option key={project.id} value={project.id}>
							{project.name}
						</option>
					))}
				</select>
				<input
					aria-label="Search issues"
					className="issue-input h-9 min-w-52 flex-1"
					onChange={(event) => setSearchQuery(event.target.value)}
					placeholder="Search issues"
					value={searchQuery}
				/>
				<ToolButton
					icon={<Filter size={16} />}
					label={`${taskCount} shown`}
					onClick={() => setActiveTab("all")}
				/>
				<ToolButton
					icon={<SlidersHorizontal size={16} />}
					label={sortNewestFirst ? "Newest" : "Oldest"}
					onClick={() => setSortNewestFirst((value) => !value)}
				/>
				<ToolButton
					icon={<Columns3 size={16} />}
					label="Columns"
					onClick={() => toggleAllColumns(visibleStatuses, setVisibleStatuses)}
				/>
			</div>
			<ColumnToggles
				visibleStatuses={visibleStatuses}
				onToggle={(status) => toggleStatus(status, setVisibleStatuses)}
			/>
			<BoardContent
				columns={columns}
				error={projectsQuery.error ?? boardQuery.error}
				isLoading={projectsQuery.isLoading || boardQuery.isLoading}
				onCreateIssue={(status) => setDialog({ mode: "create", status })}
				onOpenIssue={(task) => setDialog({ mode: "edit", task })}
			/>
			{dialog && selectedProjectId ? (
				<IssueDialog
					defaultStatus={dialogStatus}
					errorMessage={mutationError}
					isDeleting={deleteTask.isPending}
					isSaving={createTask.isPending || updateTask.isPending}
					mode={dialog.mode}
					onClose={() => setDialog(null)}
					onDelete={dialog.mode === "edit" ? deleteDialogTask : undefined}
					onSubmit={submitDialog}
					projectId={selectedProjectId}
					task={dialog.mode === "edit" ? dialog.task : undefined}
				/>
			) : null}
			{isChatDialogOpen ? (
				<TaskCreateChatDialog
					defaultProjectId={selectedProject?.externalProjectId ?? ""}
					onClose={() => setIsChatDialogOpen(false)}
				/>
			) : null}
		</section>
	);
}

function matchesSearch(task: ProjectBoardTaskRecord, query: string): boolean {
	const normalized = query.trim().toLowerCase();
	if (!normalized) {
		return true;
	}
	return `${task.id} ${task.title} ${task.content} ${task.creatorId}`
		.toLowerCase()
		.includes(normalized);
}

function toggleStatus(
	status: string,
	setVisibleStatuses: (updater: (current: string[]) => string[]) => void,
): void {
	setVisibleStatuses((current) =>
		current.includes(status)
			? current.filter((item) => item !== status)
			: [...current, status],
	);
}

function toggleAllColumns(
	visibleStatuses: string[],
	setVisibleStatuses: (updater: (current: string[]) => string[]) => void,
): void {
	setVisibleStatuses(() =>
		visibleStatuses.length === STATUS_ORDER.length
			? ["planning"]
			: [...STATUS_ORDER],
	);
}
