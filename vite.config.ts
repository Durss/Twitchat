import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import VuePlugin from "@vitejs/plugin-vue";
import * as fs from "fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import * as path from "path";
import { fileURLToPath, URL } from "url";
import { createLogger, defineConfig } from "vite-plus";
import loadVersion from "vite-plugin-package-version";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const pkg = require("./package.json");

/**
 * Plugin is not bundled properly.
 * After upgrading project to module type, the import got broken.
 * We should only have to to loadVersion() but the function is
 * actually on a "loadVersion.default".
 * The following is a safe fallback solution.
 * @see https://github.com/vitejs/vite/issues/5694
 */
const loadVersionPlugin = (loadVersion as any).default || loadVersion;
// https://vitejs.dev/config/
export default defineConfig({
	publicDir: "static",
	server: {
		port: 8081,
		allowedHosts: ["dev.twitchat.fr", "localhost"],
		proxy: {
			"/api": {
				target: "http://localhost:3018",
				changeOrigin: true,
				secure: false,
			},
		},
	},

	plugins: [
		VuePlugin(),
		loadVersionPlugin(),
		VueI18nPlugin({
			/* options */
			// locale messages resource pre-compile option
			include: resolve(dirname(fileURLToPath(import.meta.url)), "./i18n/**"),
			runtimeOnly: false,
		}),
		{
			/**
			 * Middleware that properly redirect any /overlay/ requests to the
			 * overlay/index.html page like production server does
			 */
			name: "custom-html-middleware",
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					const url = req.url as string;
					if (url.startsWith("/overlay/label")) {
						const overlayLabelHtmlPath = path.resolve(__dirname, "overlayLabel.html");
						if (fs.existsSync(overlayLabelHtmlPath)) {
							res.setHeader("Content-Type", "text/html");
							res.end(fs.readFileSync(overlayLabelHtmlPath));
							return;
						}
					} else if (url.startsWith("/overlay/sfxr")) {
						const overlaySfxrHtmlPath = path.resolve(__dirname, "overlaySfxr.html");
						if (fs.existsSync(overlaySfxrHtmlPath)) {
							res.setHeader("Content-Type", "text/html");
							res.end(fs.readFileSync(overlaySfxrHtmlPath));
							return;
						}
					} else if (url.startsWith("/overlay/")) {
						const overlayHtmlPath = path.resolve(__dirname, "overlay.html");
						if (fs.existsSync(overlayHtmlPath)) {
							res.setHeader("Content-Type", "text/html");
							res.end(fs.readFileSync(overlayHtmlPath));
							return;
						}
					} else if (url.startsWith("/public/")) {
						const publicHtmlPath = path.resolve(__dirname, "public.html");
						if (fs.existsSync(publicHtmlPath)) {
							res.setHeader("Content-Type", "text/html");
							res.end(fs.readFileSync(publicHtmlPath));
							return;
						}
					} else if (url.startsWith("/popup/oauth")) {
						const publicHtmlPath = path.resolve(__dirname, "popupAuthResult.html");
						if (fs.existsSync(publicHtmlPath)) {
							res.setHeader("Content-Type", "text/html");
							res.end(fs.readFileSync(publicHtmlPath));
							return;
						}
					}

					next();
				});
			},
		},
	],

	optimizeDeps: {
		exclude: ["vue-facing-decorator"],
		entries: [],
	},

	build: {
		target: "es2020",
		sourcemap: true,

		rolldownOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
				overlay: resolve(__dirname, "overlay.html"),
				public: resolve(__dirname, "public.html"),
				overlayLabel: resolve(__dirname, "overlayLabel.html"),
				overlaySfxr: resolve(__dirname, "overlaySfxr.html"),
				popupAuthResult: resolve(__dirname, "popupAuthResult.html"),
			},
			output: {
				entryFileNames: "assets/[name]-[hash]-" + pkg.version + ".js",
			},
		},
	},

	resolve: {
		alias: [
			{
				find: "@",
				replacement: fileURLToPath(new URL("./src_front", import.meta.url)),
			},
			{
				find: "vue-i18n",
				replacement: "vue-i18n/dist/vue-i18n.esm-bundler.js",
			},
		],
	},

	css: {
		preprocessorOptions: {
			less: {
				//Requires proper version of less-loader to work. Tested with 8.0.0
				additionalData: `
					@import "./src_front/less/_includes.less";
				`,
			},
		},
	},

	lint: {
		ignorePatterns: ["dist/**", "server/**", "static/**"],
		options: {
			typeAware: true,
			typeCheck: true,
		},
		rules: {
			"no-unused-vars": [
				"warn",
				{
					varsIgnorePattern: "^_",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"typescript/no-unused-vars": [
				"warn",
				{
					varsIgnorePattern: "^_",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"typescript/unbound-method": ["warn", { ignoreStatic: true }],
			"typescript/no-floating-promises": [
				"warn",
				{
					allowForKnownSafeCalls: [
						{ from: "file", name: "set", path: "src_front/store/DataStoreCommon.ts" },
						{
							from: "file",
							name: ["incrementLabelValue", "updateLabelValue"],
							path: "src_front/store/labels/storeLabels.ts",
						},
						{
							from: "file",
							name: ["incrementLabelValue", "updateLabelValue"],
							path: "src_front/store/StoreProxy.ts",
						},
						{
							from: "file",
							name: "broadcast",
							path: "src_front/utils/PublicAPI.ts",
						},
						{
							from: "file",
							name: "sendMessage",
							path: "src_front/messaging/MessengerProxy.ts",
						},
						{
							from: "file",
							name: ["deleteMessage", "updateMessage", "addMessage"],
							path: "src_front/store/Database.ts",
						},
						{
							from: "package",
							name: "push",
							package: "vue-router",
						},
					],
				},
			],
		},
	},

	pack: {
		entry: ["src_lande/lande_worker.ts"],
		format: ["iife"],
		outDir: "./static",
		clean: false,
		deps: { onlyBundle: false },
		outputOptions: {
			entryFileNames: "[name].js",
		},
	},

	customLogger: (() => {
		const logger = createLogger();
		// oxlint-disable-next-line typescript/unbound-method
		const warn = logger.warn;

		logger.warn = (message, options) => {
			// Ignore specific warning
			if (message.includes("dynamic import will not move module into another chunk")) {
				return;
			}

			// Filter out wrong warning from Vite on <table> content
			if (
				typeof message === "string" &&
				message.includes("<tr> cannot be child of <table>")
			) {
				return;
			}

			warn(message, options);
		};

		return logger;
	})(),
});
