"use client";

import type { ReactElement, ReactNode } from "react";

export function ActivityRichText({ body }: { body: string }): ReactElement {
	const lines = body.split(/\r?\n/);
	return (
		<div className="grid gap-3 text-sm leading-6 text-zinc-300">
			{lines.map((line, index) => renderLine(line, index))}
		</div>
	);
}

function renderLine(line: string, index: number): ReactElement {
	const trimmed = line.trim();
	if (!trimmed) {
		return <span aria-hidden="true" key={lineKey(index, line)} />;
	}
	if (trimmed.startsWith("# ")) {
		return (
			<h3
				className="m-0 text-lg font-semibold text-zinc-100"
				key={lineKey(index, line)}
			>
				{renderInline(trimmed.slice(2))}
			</h3>
		);
	}
	if (trimmed.startsWith("## ")) {
		return (
			<h4
				className="m-0 text-base font-semibold text-zinc-100"
				key={lineKey(index, line)}
			>
				{renderInline(trimmed.slice(3))}
			</h4>
		);
	}
	if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
		return (
			<ul
				className="m-0 list-disc pl-5 text-zinc-300"
				key={lineKey(index, line)}
			>
				<li>{renderInline(trimmed.slice(2))}</li>
			</ul>
		);
	}
	return (
		<p className="m-0 text-zinc-300" key={lineKey(index, line)}>
			{renderInline(trimmed)}
		</p>
	);
}

function renderInline(text: string): ReactNode[] {
	return splitInline(text).map((part) => {
		if (part.isCode) {
			return (
				<code
					className="rounded border border-zinc-700 bg-zinc-800/70 px-1.5 py-0.5 font-mono text-zinc-200"
					key={part.key}
				>
					{part.text}
				</code>
			);
		}
		return <span key={part.key}>{part.text}</span>;
	});
}

function splitInline(
	text: string,
): Array<{ key: string; text: string; isCode: boolean }> {
	const parts: Array<{ key: string; text: string; isCode: boolean }> = [];
	const codePattern = /`[^`]+`/g;
	let cursor = 0;
	for (const match of text.matchAll(codePattern)) {
		const start = match.index;
		if (start > cursor) {
			parts.push({
				key: `${cursor}-${start}`,
				text: text.slice(cursor, start),
				isCode: false,
			});
		}
		const end = start + match[0].length;
		parts.push({
			key: `${start}-${end}`,
			text: match[0].slice(1, -1),
			isCode: true,
		});
		cursor = end;
	}
	if (cursor < text.length) {
		parts.push({
			key: `${cursor}-${text.length}`,
			text: text.slice(cursor),
			isCode: false,
		});
	}
	return parts;
}

function lineKey(index: number, line: string): string {
	return `${index}-${line}`;
}
