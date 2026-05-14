"use client";

import type { ReactElement } from "react";

import type {
	SidebarDisplayMode,
	SidebarNavItem,
} from "@/components/web-shell/web-shell.types";

interface WebSidebarProps {
	mode: SidebarDisplayMode;
	activeKey: SidebarNavItem["key"];
	navItems: SidebarNavItem[];
	onNavSelect: (key: SidebarNavItem["key"]) => void;
	onToggleMode: () => void;
}

const iconByKey: Record<SidebarNavItem["key"], string> = {
	agents: "A",
	runtimes: "R",
	skills: "S",
	settings: "Se",
	issues: "I",
	projects: "P",
	inbox: "In",
	autopilot: "Au",
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
	onToggleMode,
}: WebSidebarProps): ReactElement {
	const isExpanded = mode === "expanded";
	const isHidden = mode === "hidden";

	return (
		<aside
			aria-label="Primary navigation"
			style={{
				width: isHidden ? "0" : isExpanded ? "15rem" : "4.25rem",
				opacity: isHidden ? 0 : 1,
				pointerEvents: isHidden ? "none" : "auto",
				transition: "width 180ms ease, opacity 120ms ease",
				overflow: "hidden",
				borderRight: "1px solid #cbd5e1",
				background: "#ffffff",
				display: "grid",
				gridTemplateRows: "auto 1fr auto",
			}}
		>
			<div style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
				<button
					type="button"
					onClick={onToggleMode}
					aria-label={nextSidebarLabel(mode)}
					title={nextSidebarLabel(mode)}
					style={{
						width: "100%",
						padding: "0.45rem 0.55rem",
						borderRadius: "6px",
						border: "1px solid #94a3b8",
						background: "#f8fafc",
						textAlign: isExpanded ? "left" : "center",
						cursor: "pointer",
					}}
				>
					{isExpanded ? "Toggle Sidebar" : "Toggle"}
				</button>
			</div>
			<nav style={{ padding: "0.5rem", display: "grid", gap: "0.4rem" }}>
				{navItems.map((item) => {
					const isActive = item.key === activeKey;
					return (
						<button
							key={item.key}
							type="button"
							onClick={() => onNavSelect(item.key)}
							aria-current={isActive ? "page" : undefined}
							title={item.label}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.6rem",
								width: "100%",
								padding: "0.5rem",
								borderRadius: "6px",
								border: "1px solid #cbd5e1",
								background: isActive ? "#e2e8f0" : "#ffffff",
								color: "#0f172a",
								cursor: "pointer",
								justifyContent: isExpanded ? "flex-start" : "center",
							}}
						>
							<span
								aria-hidden
								style={{
									display: "inline-flex",
									width: "1.4rem",
									height: "1.4rem",
									alignItems: "center",
									justifyContent: "center",
									borderRadius: "4px",
									background: "#f1f5f9",
									fontSize: "0.72rem",
									fontWeight: 600,
								}}
							>
								{iconByKey[item.key]}
							</span>
							{isExpanded ? <span>{item.label}</span> : null}
						</button>
					);
				})}
			</nav>
			<div
				style={{
					padding: "0.75rem",
					borderTop: "1px solid #e2e8f0",
					color: "#475569",
					fontSize: "0.8rem",
					whiteSpace: "nowrap",
				}}
			>
				{isExpanded ? "ADHD Web Console" : "ADHD"}
			</div>
		</aside>
	);
}
