import { fileURLToPath, URL } from 'url';
import vue from '@vitejs/plugin-vue';
import { createLogger, defineConfig } from 'vite';
import loadVersion from 'vite-plugin-package-version';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import { resolve, dirname } from 'node:path';

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
		port: 8080,
	},

	plugins: [
		vue(),
		loadVersionPlugin(),
		VueI18nPlugin({
		  /* options */
		  // locale messages resource pre-compile option
		  include: resolve(dirname(fileURLToPath(import.meta.url)), './i18n/**'),
		}),
	],

	optimizeDeps: {
		// exclude: ['tmi.js'],
		esbuildOptions: {
			target: 'es2015'
		}
	},

	build: {
		target: 'es2015',
		sourcemap: true,

		rollupOptions: {
			output:{
				entryFileNames: "assets/[name]-[hash]-"+process.env.npm_package_version+".js",
			}
		},
	},

	resolve: {
		alias: [
			{
				find:"@",
				replacement: fileURLToPath(new URL('./src_front', import.meta.url)),
			},
			{
				find: 'vue-i18n',
				replacement: 'vue-i18n/dist/vue-i18n.cjs.js',
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

			warn(message, options);
		};

		return logger;
	})(),
});