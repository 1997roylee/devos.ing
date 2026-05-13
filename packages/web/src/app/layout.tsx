import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
	title: "Agentic Development Hub & Daemon",
	description: "Talk is cheap, show me your agent system.",
};

type Props = {
	children: ReactNode;
};

export default function RootLayout({ children }: Props): ReactElement {
	return (
		<html lang="en">
			<body>
				<AppProviders>{children}</AppProviders>
			</body>
		</html>
	);
}
