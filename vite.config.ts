import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import loadVersion from 'vite-plugin-package-version';

// https://vitejs.dev/config/
export default defineConfig({
	server:{
		port:8080,
	},

	plugins: [vue(),loadVersion()],

	optimizeDeps: {
		// exclude: ['tmi.js'],
		esbuildOptions: {
			target: 'es2015'
		}
	},

	build: {
		target: 'es2015',
		sourcemap: true,
	},

	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src_front', import.meta.url))
		}
	},

	css: {
		preprocessorOptions: {
			less: {
				//Requires proper version of less-loader to work. Tested with 8.0.0
				additionalData: `
					@import "./src_front/less/index.less";
					@import "./src_front/less/_includes.less";
				`
			}
		}
	}
});