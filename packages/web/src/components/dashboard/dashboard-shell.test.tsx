import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DashboardShell } from "./dashboard-shell";

describe("DashboardShell", () => {
	it("renders dashboard navigation entries", () => {
		const html = renderToStaticMarkup(<DashboardShell />);

		expect(html).toContain("Dashboard sections");
		expect(html).toContain("Token usage");
		expect(html).toContain("Jobs");
		expect(html).toContain("Agents");
		expect(html).toContain("Skills");
	});
});
