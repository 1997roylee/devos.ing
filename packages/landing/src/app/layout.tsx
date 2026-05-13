import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
	title: "devos.ing | Agentic Development Hub & Daemon",
	description:
		"Turn Linear issues into staged agent workflows: plan, implement, review, and test with operator control.",
};

type Props = {
	children: ReactNode;
};

export default function RootLayout({ children }: Props): ReactElement {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
