"use client";

import { type ReactElement, useEffect, useMemo, useState } from "react";

import { WebJobBoard } from "@/components/web-shell/web-job-board";
import type {
	SidebarDisplayMode,
	SidebarNavItem,
} from "@/components/web-shell/web-shell.types";
import { WebSidebar } from "@/components/web-shell/web-sidebar";

const navItems: SidebarNavItem[] = [
	{ key: "agents", label: "Agents" },
	{ key: "runtimes", label: "Runtimes" },
	{ key: "skills", label: "Skills" },
	{ key: "settings", label: "Settings" },
	{ key: "issues", label: "Issues" },
	{ key: "projects", label: "Projects" },
	{ key: "inbox", label: "Inbox" },
	{ key: "autopilot", label: "Autopilot" },
];

function nextMode(
	mode: SidebarDisplayMode,
	isCompactViewport: boolean,
): SidebarDisplayMode {
	if (isCompactViewport) {
		if (mode === "hidden") {
			return "collapsed";
		}
		return "hidden";
	}
	if (mode === "expanded") {
		return "collapsed";
	}
	if (mode === "collapsed") {
		return "hidden";
	}
	return "expanded";
}

export function WebOperatorShell(): ReactElement {
	const [sidebarMode, setSidebarMode] =
		useState<SidebarDisplayMode>("expanded");
	const [activeNavKey, setActiveNavKey] =
		useState<SidebarNavItem["key"]>("agents");
	const [isCompactViewport, setIsCompactViewport] = useState<boolean>(false);
	const canShowSidebar = sidebarMode !== "hidden";
	const showFloatingToggle = sidebarMode === "hidden";

	useEffect(() => {
		const mediaQuery = window.matchMedia("(max-width: 900px)");
		const syncViewport = (): void => {
			setIsCompactViewport(mediaQuery.matches);
		};
		syncViewport();
		mediaQuery.addEventListener("change", syncViewport);
		return () => {
			mediaQuery.removeEventListener("change", syncViewport);
		};
	}, []);

	useEffect(() => {
		if (isCompactViewport && sidebarMode === "expanded") {
			setSidebarMode("collapsed");
		}
	}, [isCompactViewport, sidebarMode]);

	const viewportColumns = useMemo(() => {
		return canShowSidebar ? "auto minmax(0, 1fr)" : "minmax(0, 1fr)";
	}, [canShowSidebar]);

	return (
		<main
			style={{
				minHeight: "100vh",
				display: "grid",
				gridTemplateColumns: viewportColumns,
				background: "#f8fafc",
				position: "relative",
				overflowX: "clip",
			}}
		>
			{showFloatingToggle ? (
				<button
					type="button"
					aria-label="Show sidebar"
					onClick={() => setSidebarMode("expanded")}
					style={{
						position: "fixed",
						top: "0.75rem",
						left: "0.75rem",
						zIndex: 10,
						padding: "0.5rem 0.7rem",
						border: "1px solid #94a3b8",
						borderRadius: "6px",
						background: "#ffffff",
						cursor: "pointer",
					}}
				>
					Show Nav
				</button>
			) : null}
			{canShowSidebar ? (
				<WebSidebar
					mode={sidebarMode}
					activeKey={activeNavKey}
					navItems={navItems}
					onNavSelect={setActiveNavKey}
					onToggleMode={() =>
						setSidebarMode((current) => nextMode(current, isCompactViewport))
					}
				/>
			) : null}
			<WebJobBoard activeKey={activeNavKey} />
		</main>
	);
}
