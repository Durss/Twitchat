import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import VuePlugin from '@vitejs/plugin-vue';
import * as fs from 'fs';
import { dirname, resolve } from 'node:path';
import * as path from 'path';
import { fileURLToPath, URL } from 'url';
import { createLogger, defineConfig } from 'vite';
import loadVersion from 'vite-plugin-package-version';

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
	},

	plugins: [
		VuePlugin(),
		loadVersionPlugin(),
		VueI18nPlugin({
			/* options */
			// locale messages resource pre-compile option
			include: resolve(dirname(fileURLToPath(import.meta.url)), './i18n/**'),
			runtimeOnly: false,
		}),
		{
			/**
			 * Middleware that properly redirect any /overlay/ requests to the
			 * overlay/index.html page like production server does
			 */
			name: 'custom-html-middleware',
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					const url = req.url;
					if (url.startsWith('/overlay/label')) {
						const overlayLabelHtmlPath = path.resolve(__dirname, 'overlayLabel.html');
						if (fs.existsSync(overlayLabelHtmlPath)) {
							res.setHeader('Content-Type', 'text/html');
							res.end(fs.readFileSync(overlayLabelHtmlPath));
							return;
						}
					}else
					if (url.startsWith('/overlay/')) {
						const overlayHtmlPath = path.resolve(__dirname, 'overlay.html');
						if (fs.existsSync(overlayHtmlPath)) {
							res.setHeader('Content-Type', 'text/html');
							res.end(fs.readFileSync(overlayHtmlPath));
							return;
						}
					}else
					if (url.startsWith('/public/')) {
						const publicHtmlPath = path.resolve(__dirname, 'public.html');
						if (fs.existsSync(publicHtmlPath)) {
							res.setHeader('Content-Type', 'text/html');
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
		// exclude: ['tmi.js'],
		esbuildOptions: {
			target: 'es2020'
		},
		exclude: ['vue-facing-decorator'],
		entries: []
	},

	esbuild: {
		target: 'es2020'
	},

	build: {
		target: 'es2020',
		sourcemap: true,

		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				overlay: resolve(__dirname, 'overlay.html'),
				public: resolve(__dirname, 'public.html'),
				overlayLabel: resolve(__dirname, 'overlayLabel.html')
			},
			output: {
				entryFileNames: "assets/[name]-[hash]-" + process.env.npm_package_version + ".js",
			}
		},
	},

	resolve: {
		alias: [
			{
				find: "@",
				replacement: fileURLToPath(new URL('./src_front', import.meta.url)),
			},
			{
				find: 'vue-i18n',
				replacement: 'vue-i18n/dist/vue-i18n.esm-bundler.js',
			}
		]
	},

	css: {
		preprocessorOptions: {
			less: {
				//Requires proper version of less-loader to work. Tested with 8.0.0
				additionalData: `
					@import "./src_front/less/_includes.less";
				`
			}
		}
	},

	customLogger: (() => {
		const logger = createLogger();
		const warn = logger.warn;

		logger.warn = (message, options) => {
			// Ignore specific warning
			if (message.includes('dynamic import will not move module into another chunk')) {
				return;
			}
					
			// Filter out wrong warning from Vite on <table> content
			if (typeof message === 'string' && message.includes('<tr> cannot be child of <table>')) {
				return;
			}

			warn(message, options);
		};

		return logger;
	})(),
});
