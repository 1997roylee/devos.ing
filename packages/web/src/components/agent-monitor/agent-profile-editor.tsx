"use client";

import type { AgentCreateRequest, AgentRecord } from "@/lib/api";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import {
	buttonStyle,
	dangerButtonStyle,
	formHeaderStyle,
	formStyle,
	gridStyle,
	headingStyle,
	inputStyle,
	labelStyle,
	textAreaStyle,
} from "./agent-profile-editor.styles";

interface AgentProfileEditorProps {
	agent: AgentRecord | null;
	onSave: (agent: AgentCreateRequest) => void;
	onDelete: (id: string) => void;
	isSaving: boolean;
	isDeleting: boolean;
}

interface AgentFormState {
	id: string;
	title: string;
	description: string;
	logo: string;
	runtime: string;
	model: string;
	concurrency: string;
	owner: string;
	skills: string;
	recentWork: string;
	activity: string;
	instructions: string;
}

const emptyForm: AgentFormState = {
	id: "",
	title: "",
	description: "",
	logo: "bot",
	runtime: "codex",
	model: "gpt-5",
	concurrency: "1",
	owner: "",
	skills: "",
	recentWork: "",
	activity: "",
	instructions: "",
};

export function AgentProfileEditor({
	agent,
	onSave,
	onDelete,
	isSaving,
	isDeleting,
}: AgentProfileEditorProps): ReactElement {
	const [form, setForm] = useState<AgentFormState>(emptyForm);
	const isExisting = Boolean(agent);
	const canSave = useMemo(
		() =>
			form.id.trim() &&
			form.title.trim() &&
			form.description.trim() &&
			form.logo.trim() &&
			form.runtime.trim() &&
			form.model.trim() &&
			Number.parseInt(form.concurrency, 10) > 0 &&
			form.owner.trim() &&
			form.instructions.trim(),
		[form],
	);

	useEffect(() => {
		if (!agent) {
			setForm(emptyForm);
			return;
		}
		setForm({
			id: agent.id,
			title: agent.title,
			description: agent.description,
			logo: agent.logo,
			runtime: agent.runtime,
			model: agent.model,
			concurrency: String(agent.concurrency),
			owner: agent.owner,
			skills: agent.skills.join(", "),
			recentWork: agent.recentWork.join(", "),
			activity: agent.activity.join(", "),
			instructions: agent.instructions,
		});
	}, [agent]);

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (!canSave) {
					return;
				}
				const now = new Date().toISOString();
				onSave({
					id: form.id.trim(),
					title: form.title.trim(),
					description: form.description.trim(),
					logo: form.logo.trim(),
					runtime: form.runtime.trim(),
					model: form.model.trim(),
					concurrency: Number.parseInt(form.concurrency, 10),
					owner: form.owner.trim(),
					createdAt: agent?.createdAt ?? now,
					updatedAt: now,
					skills: splitList(form.skills),
					recentWork: splitList(form.recentWork),
					activity: splitList(form.activity),
					instructions: form.instructions.trim(),
				});
			}}
			style={formStyle}
		>
			<div style={formHeaderStyle}>
				<h2 style={headingStyle}>{isExisting ? "Edit Agent" : "New Agent"}</h2>
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
					<button
						type="submit"
						disabled={!canSave || isSaving}
						style={buttonStyle}
					>
						{isSaving ? "Saving" : "Save"}
					</button>
					{agent ? (
						<button
							type="button"
							disabled={isDeleting}
							onClick={() => onDelete(agent.id)}
							style={dangerButtonStyle}
						>
							{isDeleting ? "Deleting" : "Delete"}
						</button>
					) : null}
				</div>
			</div>
			<div style={gridStyle}>
				{field("ID", "id", form, setForm, isExisting)}
				{field("Title", "title", form, setForm)}
				{field("Logo", "logo", form, setForm)}
				{field("Runtime", "runtime", form, setForm)}
				{field("Model", "model", form, setForm)}
				{field("Concurrency", "concurrency", form, setForm, false, "number")}
				{field("Owner", "owner", form, setForm)}
				{field("Skills", "skills", form, setForm)}
				{field("Recent Work", "recentWork", form, setForm)}
				{field("Activity", "activity", form, setForm)}
			</div>
			<label style={labelStyle}>
				Description
				<textarea
					value={form.description}
					onChange={(event) =>
						setForm((current) => ({
							...current,
							description: event.target.value,
						}))
					}
					rows={3}
					style={textAreaStyle}
				/>
			</label>
			<label style={labelStyle}>
				Instructions
				<textarea
					value={form.instructions}
					onChange={(event) =>
						setForm((current) => ({
							...current,
							instructions: event.target.value,
						}))
					}
					rows={5}
					style={textAreaStyle}
				/>
			</label>
		</form>
	);
}

function field(
	label: string,
	key: keyof AgentFormState,
	form: AgentFormState,
	setForm: (update: (current: AgentFormState) => AgentFormState) => void,
	disabled = false,
	type = "text",
): ReactElement {
	return (
		<label style={labelStyle}>
			{label}
			<input
				type={type}
				value={form[key]}
				disabled={disabled}
				onChange={(event) =>
					setForm((current) => ({ ...current, [key]: event.target.value }))
				}
				style={inputStyle}
			/>
		</label>
	);
}

function splitList(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}
