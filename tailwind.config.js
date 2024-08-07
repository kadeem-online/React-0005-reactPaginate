/** @type {import('tailwindcss').Config} */
export default {
	content: ["index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			container: {
				center: true,
				padding: "20px",
			},
		},
	},
	plugins: [],
};
