export const formStyle = {
	border: "1px solid #27272a",
	borderRadius: "8px",
	background: "#18191d",
	padding: "1rem",
	display: "grid",
	gap: "0.85rem",
} as const;

export const formHeaderStyle = {
	display: "flex",
	justifyContent: "space-between",
	gap: "0.75rem",
	alignItems: "center",
	flexWrap: "wrap",
} as const;

export const headingStyle = { margin: 0, fontSize: "1rem" } as const;

export const gridStyle = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
	gap: "0.75rem",
} as const;

export const labelStyle = {
	display: "grid",
	gap: "0.3rem",
	color: "#d4d4d8",
	fontSize: "0.85rem",
} as const;

export const inputStyle = {
	border: "1px solid #3f3f46",
	borderRadius: "6px",
	background: "#0f1013",
	color: "#f4f4f5",
	padding: "0.55rem 0.65rem",
} as const;

export const textAreaStyle = { ...inputStyle, resize: "vertical" } as const;

export const buttonStyle = {
	border: "1px solid #3f3f46",
	borderRadius: "6px",
	background: "#27272a",
	color: "#f4f4f5",
	cursor: "pointer",
	padding: "0.5rem 0.75rem",
} as const;

export const dangerButtonStyle = {
	...buttonStyle,
	borderColor: "#7f1d1d",
	background: "#451a1a",
} as const;
