import type { Config } from "tailwindcss";

const config: Config = {
	content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
	theme: {
		extend: {
			colors: {
				ink: "#10110d",
				paper: "#f2eadc",
				bone: "#fff8e9",
				copper: "#b87333",
				circuit: "#b7ff4a",
				oxide: "#24342a",
			},
			fontFamily: {
				display: ["Georgia", "Iowan Old Style", "serif"],
				body: ["Aptos", "Gill Sans", "Trebuchet MS", "sans-serif"],
				mono: ["IBM Plex Mono", "Menlo", "monospace"],
			},
			boxShadow: {
				"hard-ink": "10px 10px 0 #10110d",
			},
		},
	},
	plugins: [],
};

export default config;
